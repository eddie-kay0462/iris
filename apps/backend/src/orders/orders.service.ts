import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import { PromosService } from '../promos/promos.service';
import {
  DiscountEngineService,
  DiscountResolution,
} from '../promos/discount-engine.service';
import { SettingsService, resolveNextPickupDate, formatPickupDate } from '../settings/settings.service';
import { PreordersService } from '../preorders/preorders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { toE164 } from '../common/utils/phone';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  dayOf,
  ONLINE_REVENUE_STATUSES,
  POPUP_REVENUE_STATUSES,
  round2,
  WALKIN_REVENUE_STATUSES,
} from '../analytics/analytics.constants';
import { fetchAll } from '../analytics/reports/report-context';

// Payment processing fee charged on top of the order amount. Kept in sync with the
// frontend checkout display (apps/frontend/app/(shop)/checkout/CheckoutClient.tsx) so
// the stored total matches what the customer is actually charged via Paystack.
const PROCESSING_FEE_RATE = 0.0195;

// Reconciliation windows for never-paid pending orders (see reconcilePendingOrders).
// GRACE: don't touch an order until the normal client-side confirm callback has had
// time to run, so we only chase genuinely stuck/abandoned attempts.
const RECONCILE_GRACE_MS = 3 * 60_000; // 3 minutes
// After this age, a pending order Paystack reports as unpaid is considered dead and
// soft-deleted so it stops cluttering the DB and abandoned-recovery matching.
const RECONCILE_DELETE_AFTER_MS = 24 * 60 * 60_000; // 24 hours
// Cap per cron tick so a backlog can't blow up a single run.
const RECONCILE_BATCH_SIZE = 50;

@Injectable()
export class OrdersService {
  private readonly frontendUrl: string;
  private readonly paystackSecretKey: string;

  constructor(
    private supabase: SupabaseService,
    private emailService: EmailService,
    private smsService: SmsService,
    private promosService: PromosService,
    private discountEngine: DiscountEngineService,
    private settingsService: SettingsService,
    private preordersService: PreordersService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://storefront.1nri.store');
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  /**
   * Available stock for a variant = inventory_quantity minus quantity held by
   * other pending orders whose hold hasn't expired yet.
   */
  private async getAvailableQuantities(
    db: ReturnType<SupabaseService['getAdminClient']>,
    variantIds: string[],
  ): Promise<Map<string, number>> {
    const { data: variants } = await db
      .from('product_variants')
      .select('id, inventory_quantity')
      .in('id', variantIds);

    const nowIso = new Date().toISOString();
    const { data: heldItems } = await db
      .from('order_items')
      .select('variant_id, quantity, orders!inner(status, hold_expires_at)')
      .in('variant_id', variantIds)
      .eq('orders.status', 'pending')
      .gt('orders.hold_expires_at', nowIso);

    const heldByVariant = new Map<string, number>();
    for (const item of heldItems || []) {
      heldByVariant.set(
        item.variant_id,
        (heldByVariant.get(item.variant_id) ?? 0) + item.quantity,
      );
    }

    const available = new Map<string, number>();
    for (const v of variants || []) {
      available.set(v.id, v.inventory_quantity - (heldByVariant.get(v.id) ?? 0));
    }
    return available;
  }

  /**
   * Guard: every ordered variant must belong to an active, non-deleted product.
   * The storefront only ever surfaces active products, but a stale cart or a
   * direct API call could still reference a draft/archived/deleted product —
   * those must not be purchasable. Throws if any variant fails the check.
   */
  private async assertProductsPurchasable(
    db: ReturnType<SupabaseService['getAdminClient']>,
    variantIds: string[],
  ): Promise<void> {
    const ids = variantIds.filter(Boolean);
    if (ids.length === 0) return;

    const { data: rows, error } = await db
      .from('product_variants')
      .select('id, products!inner(status, deleted_at)')
      .in('id', ids);

    if (error) throw error;

    for (const row of rows || []) {
      const product = (row as any).products;
      if (!product || product.status !== 'active' || product.deleted_at) {
        throw new BadRequestException(
          'One or more items are no longer available',
        );
      }
    }
  }

  /**
   * Live fulfillment preview for a set of cart lines, using the SAME rule as
   * create(): a line is 'in_stock' when enough is available (inventory minus
   * active holds), 'preorder' when it's short but the variant is preorder_enabled,
   * or 'unavailable' otherwise. Lets the checkout badge/label a line that will be
   * auto-converted to a pre-order — even if the shopper added it while in stock.
   */
  async previewFulfillment(
    items: { variantId: string; quantity: number }[],
  ): Promise<Record<string, 'in_stock' | 'preorder' | 'unavailable'>> {
    const db = this.supabase.getAdminClient();
    const variantIds = items.map((i) => i.variantId).filter(Boolean);
    if (variantIds.length === 0) return {};

    const available = await this.getAvailableQuantities(db, variantIds);
    const { data: variantMeta } = await db
      .from('product_variants')
      .select('id, preorder_enabled, products!inner(status, deleted_at)')
      .in('id', variantIds);
    const preorderEnabled = new Map(
      (variantMeta || []).map((v) => [v.id, v.preorder_enabled === true]),
    );
    const purchasable = new Map(
      (variantMeta || []).map((v) => {
        const product = (v as any).products;
        return [v.id, product?.status === 'active' && !product?.deleted_at];
      }),
    );

    const result: Record<string, 'in_stock' | 'preorder' | 'unavailable'> = {};
    for (const item of items) {
      const availableQty = available.get(item.variantId);
      if (availableQty === undefined || !purchasable.get(item.variantId)) {
        result[item.variantId] = 'unavailable';
      } else if (availableQty >= item.quantity) {
        result[item.variantId] = 'in_stock';
      } else if (preorderEnabled.get(item.variantId)) {
        result[item.variantId] = 'preorder';
      } else {
        result[item.variantId] = 'unavailable';
      }
    }
    return result;
  }

  private async generateOrderNumber(): Promise<string> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1);

    let next = 1;
    if (data && data.length > 0) {
      const match = data[0].order_number.match(/IRD-(\d+)/);
      if (match) next = parseInt(match[1], 10) + 1;
    }

    // Floor at the configured start so the first real order reads as a clean
    // high number (e.g. IRD-001001) rather than "order #1".
    const start = await this.settingsService.getOrderNumberStart();
    next = Math.max(next, start);

    return `IRD-${String(next).padStart(6, '0')}`;
  }

  /**
   * Server-authoritative shipping cost. For international destinations we charge
   * the flat per-country rate stored in settings (never the client-supplied
   * amount) so the fee can't be tampered with; Ghana keeps the tiered domestic
   * option the client picked.
   */
  private async resolveShippingCost(dto: CreateOrderDto): Promise<number> {
    // Collection at a pop-up is free by definition — never charged, whatever the
    // client posts. Checked before the country branch so it also wins over an
    // international flat rate (pickup abroad is rejected in create() anyway).
    if (dto.shippingMethod === 'popup_pickup') return 0;

    const country = dto.shippingAddress?.region;
    if (country && country !== 'GH') {
      const rate = await this.settingsService.getShippingRateForCountry(country);
      if (rate === null) {
        throw new BadRequestException(
          `We don't currently ship to the selected country (${country}).`,
        );
      }
      return rate;
    }
    return dto.shippingCost ?? 0;
  }

  async create(dto: CreateOrderDto, userId: string | null, email: string | null) {
    const resolvedEmail = email ?? dto.guestEmail ?? '';
    if (!resolvedEmail) {
      throw new BadRequestException('Email is required for guest checkout');
    }
    if (dto.shippingAddress?.phone) {
      dto.shippingAddress.phone = toE164(dto.shippingAddress.phone) ?? dto.shippingAddress.phone;
    }
    const db = this.supabase.getAdminClient();

    // 0. Idempotency: a retry against the same payment_reference means the
    // customer is either still within their stock hold (return as-is), using
    // their one allowed hold refresh, or the hold is dead for good.
    const { data: existingOrder } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('payment_reference', dto.paymentReference)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.payment_status === 'paid') {
        return existingOrder;
      }

      const holdExpired =
        !existingOrder.hold_expires_at ||
        new Date(existingOrder.hold_expires_at) <= new Date();

      if (!holdExpired) {
        return existingOrder;
      }

      if (existingOrder.hold_refreshed) {
        throw new GoneException(
          'Your reservation has expired. Please restart checkout.',
        );
      }

      const holdMinutes = await this.settingsService.getStockHoldMinutes();
      const newExpiry = new Date(Date.now() + holdMinutes * 60_000).toISOString();
      const { data: refreshed, error: refreshError } = await db
        .from('orders')
        .update({ hold_expires_at: newExpiry, hold_refreshed: true })
        .eq('id', existingOrder.id)
        .select('*, order_items(*)')
        .single();

      if (refreshError) throw refreshError;
      return refreshed;
    }

    // 1. Reject items whose product is no longer purchasable (draft/archived/
    // deleted), then validate stock for the rest against availability (inventory
    // minus quantities held by other still-active pending orders). Items that are
    // out of stock but flagged preorder_enabled are auto-routed to the pre-order
    // flow instead of being rejected, so the customer is never told "out of stock".
    await this.assertProductsPurchasable(
      db,
      dto.items.map((i) => i.variantId),
    );

    const available = await this.getAvailableQuantities(
      db,
      dto.items.map((i) => i.variantId),
    );

    const { data: variantMeta } = await db
      .from('product_variants')
      .select('id, preorder_enabled')
      .in('id', dto.items.map((i) => i.variantId));
    const preorderEnabled = new Map(
      (variantMeta || []).map((v) => [v.id, v.preorder_enabled === true]),
    );

    const inStockItems: typeof dto.items = [];
    const preorderItems: typeof dto.items = [];

    for (const item of dto.items) {
      const availableQty = available.get(item.variantId);
      if (availableQty === undefined) {
        throw new BadRequestException(`Variant ${item.variantId} not found`);
      }

      if (availableQty >= item.quantity) {
        inStockItems.push(item);
      } else if (preorderEnabled.get(item.variantId)) {
        // Fully or partially short on stock, but pre-orderable → record the
        // whole line as a pre-order.
        preorderItems.push(item);
      } else {
        throw new BadRequestException(
          `Insufficient stock for "${item.productTitle}". Available: ${availableQty}`,
        );
      }
    }

    // 1a. Express shipping is not offered for pre-orders: a pre-ordered line ships
    // separately once restocked, so an expedited method can't be honoured for it.
    if (preorderItems.length > 0 && dto.shippingMethod === 'express') {
      throw new BadRequestException(
        'Express shipping is not available for orders containing pre-order items.',
      );
    }

    // 1a-ii. Pop-up collection is the free alternative to waiting for a pre-order
    // to be restocked and shipped, so it's only offered on carts that actually
    // contain pre-order lines, only within Ghana, and only while staff have it on.
    // Re-checked here because the checkout page may have been open for a while.
    let pickupDate: string | null = null;
    let pickupEventId: string | null = null;
    if (dto.shippingMethod === 'popup_pickup') {
      if (preorderItems.length === 0) {
        throw new BadRequestException(
          'Pop-up collection is only available for orders containing pre-order items.',
        );
      }
      if (dto.shippingAddress?.region !== 'GH') {
        throw new BadRequestException(
          'Pop-up collection is only available for orders within Ghana.',
        );
      }
      const pickupConfig = await this.settingsService.getPopupPickup();
      if (!pickupConfig.enabled) {
        throw new BadRequestException(
          'Pop-up collection is not currently available. Please choose a delivery option.',
        );
      }
      // Resolved server-side, never taken from the client: a checkout left open
      // across the lead-time cut-off gets the correctly rolled-forward pop-up.
      pickupDate = resolveNextPickupDate(
        pickupConfig.pickupWeekday,
        pickupConfig.leadDays,
      )
        .toISOString()
        .slice(0, 10);
      pickupEventId = await this.resolvePickupEventId(pickupDate);
    }

    // 1b. Validate pre-order eligibility BEFORE inserting anything, so an
    // ineligible line (limit reached, duplicate, price mismatch) doesn't leave an
    // orphaned order behind.
    const validatedPreorders = preorderItems.length
      ? await this.preordersService.validatePreorderItems(
          preorderItems.map((i) => ({
            variantId: i.variantId,
            productTitle: i.productTitle,
            variantTitle: i.variantTitle,
            quantity: i.quantity,
            price: i.price,
          })),
          { userId, email: resolvedEmail },
        )
      : [];

    // 2. Calculate totals
    const subtotal = dto.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const shippingCost = await this.resolveShippingCost(dto);

    // 2b. Resolve discounts through the shared engine. A typed code and any
    // auto-applied pairing rules compete and the larger one wins; the engine
    // recomputes the subtotal from the line items, so nothing here trusts a
    // client-supplied amount. An invalid typed code throws.
    const discount = await this.discountEngine.resolve({
      channel: 'online',
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        unitPrice: i.price,
        quantity: i.quantity,
      })),
      shippingCost,
      code: dto.promoCode,
    });
    const discountAmount = discount.discountAmount;
    const appliedPromoCodeId = discount.promoCodeId;

    const amountBeforeFees = Math.max(0, subtotal + shippingCost - discountAmount);
    const processingFee = Math.round(amountBeforeFees * PROCESSING_FEE_RATE * 100) / 100;
    const total = amountBeforeFees + processingFee;

    // 3. Generate order number
    const orderNumber = await this.generateOrderNumber();

    const guestToken = !userId ? crypto.randomUUID() : null;
    // A stock hold only matters when there's in-stock inventory to reserve. For an
    // all-pre-order checkout the order is just a payment/shipping container, so we
    // leave the hold null (and the checkout hold timer stays hidden).
    const holdMinutes = await this.settingsService.getStockHoldMinutes();
    const holdExpiresAt = inStockItems.length > 0
      ? new Date(Date.now() + holdMinutes * 60_000).toISOString()
      : null;

    // 4. Insert order
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        email: resolvedEmail,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        discount: discountAmount,
        shipping_cost: shippingCost,
        processing_fee: processingFee,
        total,
        currency: 'GHS',
        shipping_address: dto.shippingAddress,
        shipping_method: dto.shippingMethod || 'standard',
        pickup_date: pickupDate,
        popup_event_id: pickupEventId,
        payment_provider: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'pending',
        applied_promo_code_id: appliedPromoCodeId,
        guest_token: guestToken,
        hold_expires_at: holdExpiresAt,
        hold_refreshed: false,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    await this.reserveDiscount(discount, order, {
      email: resolvedEmail,
      userId,
    });

    // 5. Insert order items — only the in-stock lines. Pre-order lines are
    // recorded separately in the preorders table below.
    if (inStockItems.length > 0) {
      const orderItems = inStockItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productTitle,
        variant_title: item.variantTitle || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await db
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    }

    // Inventory is not deducted here — the in-stock order items above are held as
    // a temporary reservation (see getAvailableQuantities) until confirmPayment()
    // converts the hold into a real, permanent deduction.

    // 6. Record the pre-order portion, linked to this order and sharing its
    // payment reference. They flip to paid alongside the order in confirmPayment().
    if (validatedPreorders.length > 0) {
      await this.preordersService.insertPreordersForOrder(
        {
          id: order.id,
          payment_reference: dto.paymentReference,
          email: resolvedEmail,
          user_id: userId,
          shipping_address: dto.shippingAddress,
        },
        validatedPreorders,
      );
    }

    const result = await this.findOne(order.id);
    return { ...result, guest_token: guestToken };
  }

  /**
   * Immediately expires a pending order's stock hold (e.g. the customer closed
   * the Paystack modal without paying), freeing the reserved stock for other
   * shoppers right away instead of waiting for the hold to lapse naturally.
   * The order row itself is left untouched (still `pending`, same
   * payment_reference) so a retry against the same reference is picked up by
   * the idempotency/one-time-refresh logic in `create()`.
   */
  async releaseHold(paymentReference: string) {
    const db = this.supabase.getAdminClient();
    await db
      .from('orders')
      .update({ hold_expires_at: new Date().toISOString() })
      .eq('payment_reference', paymentReference)
      .eq('status', 'pending');
    return { released: true };
  }

  async findOne(id: string) {
    const db = this.supabase.getAdminClient();

    // A real orders.id is a UUID. Popup pre-order groups are addressed by their
    // shared order_number (e.g. PRE-001234) since they have no orders row.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      const { data, error } = await db
        .from('orders')
        .select('*, order_items(*, product:products(vendor)), order_status_history(*), preorders(*)')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          ...data,
          contains_preorders: (data.preorders?.length ?? 0) > 0,
          is_popup_preorder: false,
        };
      }
    }

    // Fall back to a synthetic popup pre-order group keyed by order_number.
    const { data: popupRows, error: popupError } = await db
      .from('preorders')
      .select('*')
      .eq('order_number', id)
      .in('source', ['popup', 'walkin']);

    if (!popupError && popupRows && popupRows.length > 0) {
      return {
        ...this.buildPopupOrderGroup(popupRows),
        order_status_history: [],
      };
    }

    throw new NotFoundException('Order not found');
  }

  async findMyOrders(userId: string, query: QueryOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (query.status) {
      q = q.eq('status', query.status);
    }

    q = q.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findMyOrder(userId: string, orderId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async findMyOrderByNumber(userId: string, orderNumber: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), preorders(*)')
      .eq('order_number', orderNumber)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  /**
   * Collapses a group of pre-order rows (all sharing one order_number) into a
   * single status, so a multi-line pre-order reads as one thing.
   *   - every line refunded  → refunded
   *   - every line cancelled → cancelled
   *   - every line fulfilled → fulfilled
   *   - any line pending     → pending
   *   - otherwise            → stock_held
   */
  private derivePreorderGroupStatus(rows: any[]): string {
    const statuses = rows.map((r) => r.status);
    if (statuses.every((s) => s === 'refunded')) return 'refunded';
    if (statuses.every((s) => s === 'cancelled')) return 'cancelled';
    if (statuses.every((s) => s === 'fulfilled')) return 'fulfilled';
    if (statuses.some((s) => s === 'pending')) return 'pending';
    return 'stock_held';
  }

  /**
   * Builds an order-shaped object from a set of pre-order rows that share an
   * order_number. Popup pre-orders have no real `orders` row, so the admin UI
   * treats these synthetic groups as first-class orders (id === order_number).
   */
  private buildPopupOrderGroup(rows: any[]): any {
    const first = rows[0];
    const subtotal = rows.reduce(
      (sum, r) => sum + Number(r.unit_price) * r.quantity,
      0,
    );
    const shippingCost = Number(first.delivery_fee ?? 0);
    const total = subtotal + shippingCost;
    const createdAt = rows
      .map((r) => r.created_at)
      .sort()[0];
    return {
      id: first.order_number,
      order_number: first.order_number,
      user_id: first.user_id ?? null,
      email: first.customer_email ?? null,
      customer_name: first.customer_name ?? null,
      status: this.derivePreorderGroupStatus(rows),
      subtotal,
      discount: 0,
      shipping_cost: shippingCost,
      tax: 0,
      total,
      currency: 'GHS',
      shipping_address: null,
      billing_address: null,
      tracking_number: null,
      carrier: null,
      payment_provider: null,
      payment_reference: first.payment_reference ?? null,
      payment_status: first.payment_status ?? null,
      payment_method: first.payment_method ?? null,
      created_at: createdAt,
      updated_at: first.updated_at ?? createdAt,
      is_popup_preorder: true,
      contains_preorders: true,
      order_items: [],
      preorders: rows,
    };
  }

  /**
   * Maps a walk-in order row (its own table) into the order shape the admin
   * Orders list expects, flagged `is_walkin` so the UI can badge and treat it
   * as read-only (it's managed on the Walk-in Sales page).
   */
  private buildWalkinOrder(w: any): any {
    return {
      id: w.id,
      order_number: w.order_number,
      user_id: w.customer_profile_id ?? null,
      email: w.customer_email ?? null,
      customer_name: w.customer_name ?? null,
      status: w.status,
      subtotal: Number(w.subtotal),
      discount: Number(w.discount_amount ?? 0),
      shipping_cost: 0,
      tax: 0,
      total: Number(w.total),
      currency: 'GHS',
      shipping_address: null,
      billing_address: null,
      tracking_number: null,
      carrier: null,
      payment_provider: null,
      payment_reference: w.payment_reference ?? null,
      payment_status: w.status === 'completed' ? 'paid' : null,
      payment_method: w.payment_method ?? null,
      created_at: w.created_at,
      updated_at: w.updated_at ?? w.created_at,
      is_popup_preorder: false,
      is_walkin: true,
      contains_preorders: false,
      order_items: (w.walkin_order_items || []).map((i: any) => ({
        id: i.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_title: i.variant_title,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
      })),
      preorders: [],
    };
  }

  async findAdmin(query: QueryOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const hasPreordersOnly = query.has_preorders === 'true';

    // 1. Real orders (may carry linked online pre-order lines). Fetch the full
    // filtered set — the merge with popup groups below is sorted + paginated in
    // JS, so we can't rely on a DB-level range here. Order volume is modest at
    // this stage; revisit if the dataset grows large.
    let q = db
      .from('orders')
      .select(
        '*, order_items(*), preorders(id, status, quantity, unit_price, source, product_name, variant_title)',
      )
      .is('deleted_at', null);

    // Never-paid checkout attempts (status='pending' AND payment_status='pending')
    // are not real orders — they exist only as a stock-hold/payment container that
    // the customer abandoned. Keep them off the Orders page; they still surface on
    // the Payments page and are reconciled/cleaned up by reconcilePendingOrders().
    // The one exception, a pending row that DID get paid, passes this filter.
    q = q.or('status.neq.pending,payment_status.neq.pending');

    if (query.status) q = q.eq('status', query.status);
    if (query.search) {
      q = q.or(
        `order_number.ilike.%${query.search}%,email.ilike.%${query.search}%`,
      );
    }
    if (query.from_date) q = q.gte('created_at', query.from_date);
    if (query.to_date) q = q.lte('created_at', query.to_date);

    const { data: orderRows, error } = await q;
    if (error) throw error;

    let orders = (orderRows || []).map((o: any) => ({
      ...o,
      contains_preorders: (o.preorders?.length ?? 0) > 0,
      is_popup_preorder: false,
    }));

    if (hasPreordersOnly) {
      orders = orders.filter((o: any) => o.contains_preorders);
    }

    // 2. Synthetic popup pre-order groups (no real orders row).
    let popupGroups: any[] = [];
    let popupQ = db
      .from('preorders')
      .select('*')
      .in('source', ['popup', 'walkin'])
      .is('order_id', null);
    if (query.search) {
      popupQ = popupQ.or(
        `order_number.ilike.%${query.search}%,customer_email.ilike.%${query.search}%`,
      );
    }
    if (query.from_date) popupQ = popupQ.gte('created_at', query.from_date);
    if (query.to_date) popupQ = popupQ.lte('created_at', query.to_date);

    const { data: popupRows, error: popupError } = await popupQ;
    if (popupError) throw popupError;

    const byNumber = new Map<string, any[]>();
    for (const row of popupRows || []) {
      const list = byNumber.get(row.order_number) || [];
      list.push(row);
      byNumber.set(row.order_number, list);
    }
    popupGroups = Array.from(byNumber.values()).map((rows) =>
      this.buildPopupOrderGroup(rows),
    );

    // Popup groups are entirely pre-orders, so the has_preorders filter keeps
    // them all. Apply the status filter (against the derived group status).
    if (query.status) {
      popupGroups = popupGroups.filter((g) => g.status === query.status);
    }

    // 3. Walk-in orders (real rows in their own table — surface as orders).
    let walkinOrders: any[] = [];
    if (!hasPreordersOnly) {
      let walkinQ = db
        .from('walkin_orders')
        .select('*, walkin_order_items(*)');
      if (query.status) walkinQ = walkinQ.eq('status', query.status);
      if (query.search) {
        walkinQ = walkinQ.or(
          `order_number.ilike.%${query.search}%,customer_email.ilike.%${query.search}%,customer_name.ilike.%${query.search}%`,
        );
      }
      if (query.from_date) walkinQ = walkinQ.gte('created_at', query.from_date);
      if (query.to_date) walkinQ = walkinQ.lte('created_at', query.to_date);

      const { data: walkinRows, error: walkinError } = await walkinQ;
      if (walkinError) throw walkinError;
      walkinOrders = (walkinRows || []).map((w: any) =>
        this.buildWalkinOrder(w),
      );
    }

    // 4. Merge, sort by date desc, paginate in JS.
    const merged = [...orders, ...popupGroups, ...walkinOrders].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const total = merged.length;
    const start = (page - 1) * limit;
    const data = merged.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAdminOrder(orderId: string) {
    return this.findOne(orderId);
  }

  /**
   * Take the promo usage seat for a freshly inserted order.
   *
   * If the code was exhausted in the moment between resolving and reserving,
   * roll the order back rather than leaving an orphaned pending row behind —
   * the customer gets a clean "usage limit" error and can retry without it.
   */
  /**
   * The pop-up event a collection date falls inside, or null if none is
   * scheduled yet.
   *
   * The pickup date comes from a weekday + lead-time setting rather than from
   * the events table, so a customer can book a collection for a week whose
   * event row has not been created. That is fine — the admin collections view
   * falls back to matching on date, and the backfill in
   * 20260827000000_popup_pickup_collections picks up the stragglers.
   */
  private async resolvePickupEventId(
    pickupDate: string | null,
  ): Promise<string | null> {
    if (!pickupDate) return null;
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('popup_events')
      .select('id, event_date, end_date')
      .lte('event_date', pickupDate)
      .neq('status', 'closed')
      .order('event_date', { ascending: false })
      .limit(5);

    const match = (data ?? []).find(
      (e: any) => (e.end_date ?? e.event_date) >= pickupDate,
    );
    return match?.id ?? null;
  }

  private async reserveDiscount(
    resolution: DiscountResolution,
    order: { id: string; order_number: string },
    ctx: { email?: string | null; userId?: string | null },
  ): Promise<void> {
    if (!resolution.source || resolution.discountAmount <= 0) return;

    try {
      await this.discountEngine.reserve({
        resolution,
        channel: 'online',
        orderTable: 'orders',
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail: ctx.email ?? null,
        customerProfileId: ctx.userId ?? null,
      });
    } catch (err) {
      await this.supabase
        .getAdminClient()
        .from('orders')
        .delete()
        .eq('id', order.id);
      throw err;
    }
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    userId: string,
  ) {
    const db = this.supabase.getAdminClient();
    const order = await this.findOne(orderId);

    const updates: Record<string, unknown> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };

    if (dto.trackingNumber) updates.tracking_number = dto.trackingNumber;
    if (dto.carrier) updates.carrier = dto.carrier;
    if (dto.status === 'shipped') updates.shipped_at = new Date().toISOString();
    if (dto.status === 'delivered')
      updates.delivered_at = new Date().toISOString();

    const { error } = await db
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;

    // DB trigger should auto-log to order_status_history,
    // but insert manually if trigger doesn't capture notes/changed_by
    await db.from('order_status_history').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: dto.status,
      notes: dto.notes || null,
      changed_by: userId,
    });

    // Cancelling or refunding from the admin side returns the promo usage too.
    if (['cancelled', 'refunded'].includes(dto.status)) {
      await this.discountEngine
        .revertForOrder('orders', orderId, `Order marked ${dto.status}`)
        .catch((err) =>
          console.error(
            `Failed to revert promo redemption for order ${order.order_number}:`,
            err,
          ),
        );
    }

    const updatedOrder = await this.findOne(orderId);

    if (dto.status === 'shipped') {
      const shippingVendors: string[] = (updatedOrder.order_items || [])
        .map((i: any) => (i.product?.vendor as string) || '1NRI');
      const shippingBrand = shippingVendors.length > 0 && shippingVendors.every((v) => v === 'Unlikely Alliances')
        ? 'Unlikely Alliances'
        : '1NRI';
      this.emailService
        .sendShippingNotification({
          email: updatedOrder.email,
          order_number: updatedOrder.order_number,
          tracking_number: updatedOrder.tracking_number,
          carrier: updatedOrder.carrier,
          brand: shippingBrand,
        })
        .catch(() => null);
    }

    return updatedOrder;
  }

  async cancelOrder(orderId: string, userId: string) {
    const db = this.supabase.getAdminClient();
    const order = await this.findOne(orderId);

    // Only the owner can cancel
    if (order.user_id !== userId) {
      throw new ForbiddenException('Not your order');
    }

    if (!['pending', 'paid'].includes(order.status)) {
      throw new BadRequestException(
        'Order can only be cancelled when pending or paid',
      );
    }

    // Update status
    const { error } = await db
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    // Hand the promo usage seat back — a cancelled order should not burn a use.
    await this.discountEngine
      .revertForOrder('orders', orderId, `Order ${order.order_number} cancelled`)
      .catch((err) =>
        console.error(
          `Failed to revert promo redemption for order ${order.order_number}:`,
          err,
        ),
      );

    // Restore inventory — only needed if it was actually deducted, which only
    // happens once the order reaches 'paid' via confirmPayment(). A still-
    // 'pending' order was only ever a temporary stock hold, never decremented.
    if (order.status === 'paid' && order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const { data: variant } = await db
          .from('product_variants')
          .select('inventory_quantity')
          .eq('id', item.variant_id)
          .single();

        const previousQty = variant?.inventory_quantity ?? 0;
        const newQty = previousQty + item.quantity;

        await db
          .from('product_variants')
          .update({ inventory_quantity: newQty })
          .eq('id', item.variant_id);

        await db.from('inventory_movements').insert({
          variant_id: item.variant_id,
          quantity_change: item.quantity,
          quantity_before: previousQty,
          quantity_after: newQty,
          movement_type: 'cancellation_reversal',
          notes: `Cancelled order ${order.order_number}`,
          created_by: userId,
        });
      }
    }

    return this.findOne(orderId);
  }

  async getAdminStats() {
    const db = this.supabase.getAdminClient();

    // Every aggregate here pages via `fetchAll` or uses an exact head count —
    // bare selects stop at PostgREST's 1000-row ceiling, which silently froze
    // total revenue, the customer count and the status breakdown.
    //
    // Total revenue — revenue-status orders only (paid/processing/shipped/
    // delivered). Never-paid pending attempts carry a `total` but aren't money in.
    const revenueData = await fetchAll<any>((a, b) =>
      db
        .from('orders')
        .select('total')
        .is('deleted_at', null)
        .in('status', ONLINE_REVENUE_STATUSES)
        .range(a, b),
    );

    const totalRevenue = round2(
      revenueData.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    );

    // Order count — excludes never-paid pending attempts, matching findAdmin().
    const { count: orderCount } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .or('status.neq.pending,payment_status.neq.pending');

    // Customer count (distinct user_ids who have orders)
    const customerData = await fetchAll<any>((a, b) =>
      db.from('orders').select('user_id').is('deleted_at', null).range(a, b),
    );

    const uniqueCustomers = new Set(
      customerData.map((o) => o.user_id).filter(Boolean),
    ).size;

    // Low stock items — counted in the DB rather than by row length.
    const { count: lowStockCountRaw } = await db
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .gt('inventory_quantity', 0)
      .lt('inventory_quantity', 10);

    const lowStockCount = lowStockCountRaw ?? 0;

    // Orders by status
    const statusData = await fetchAll<any>((a, b) =>
      db.from('orders').select('status').is('deleted_at', null).range(a, b),
    );

    const ordersByStatus: Record<string, number> = {};
    statusData.forEach((o) => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    // Recent revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentData = await fetchAll<any>((a, b) =>
      db
        .from('orders')
        .select('total, created_at')
        .is('deleted_at', null)
        .in('status', ONLINE_REVENUE_STATUSES)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .range(a, b),
    );

    const recentRevenue = round2(
      recentData.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    );

    return {
      totalRevenue,
      recentRevenue,
      orderCount: orderCount || 0,
      customerCount: uniqueCustomers,
      lowStockCount,
      ordersByStatus,
    };
  }

  async findAdminCustomers(query: {
    search?: string;
    page?: string;
    limit?: string;
    min_orders?: string;
    max_orders?: string;
    include_all_roles?: string;
  }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const hasOrderFilter = query.min_orders !== undefined || query.max_orders !== undefined;
    const includeAllRoles = query.include_all_roles === 'true';

    // ── 1. Fetch profiles ────────────────────────────────────────────────────
    // When an order-count filter is active we must fetch ALL matching profiles
    // first (no DB-level pagination), because the DB doesn't know order counts.
    // We then enrich all of them, filter, and paginate in memory.
    // When there is no filter the DB handles pagination directly (fast path).

    const buildBaseQuery = () => {
      let q = db
        .from('profiles')
        .select('*', { count: 'exact' });

      if (!includeAllRoles) {
        q = q.or('role.eq.public,role.is.null');
      }

      if (query.search) {
        q = q.or(
          `email.ilike.%${query.search}%,phone_number.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`,
        );
      }

      return q.order('created_at', { ascending: false });
    };

    let profiles: any[];
    let dbCount: number;

    if (hasOrderFilter) {
      // No .range() — fetch the full matching set so we can filter accurately
      const { data, count, error } = await buildBaseQuery();
      if (error) throw error;
      profiles = data || [];
      dbCount = count || 0;
    } else {
      // DB-paginated fast path
      const from = (page - 1) * limit;
      const { data, count, error } = await buildBaseQuery().range(from, from + limit - 1);
      if (error) throw error;
      profiles = data || [];
      dbCount = count || 0;
    }

    if (profiles.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // ── 2. Batch fetch order data for all profiles in one round-trip each ────

    const userIds = profiles.map((p) => p.id).filter(Boolean) as string[];
    const emails = profiles
      .map((p) => p.email?.toLowerCase())
      .filter((e): e is string => !!e);
    const phones = profiles
      .map((p) => toE164(p.phone_number))
      .filter((p): p is string => p !== null);

    // Lifetime spend uses the SAME revenue whitelists as every analytics metric.
    // This previously excluded only cancelled/refunded, which meant never-paid
    // `pending` checkout attempts (Iris creates the order before payment) and
    // open/held pop-up tickets were counted as money the customer had spent.
    type InPersonOrder = {
      id: string;
      customer_email: string | null;
      customer_phone: string | null;
      total: string;
      created_at: string;
    };
    const inPersonSelect =
      'id, customer_email, customer_phone, total, created_at';

    const byEmailAndPhone = (table: 'popup_orders' | 'walkin_orders', statuses: string[]) =>
      Promise.all([
        emails.length > 0
          ? fetchAll<InPersonOrder>((a, b) =>
              db
                .from(table)
                .select(inPersonSelect)
                .in('customer_email', emails)
                .in('status', statuses)
                .range(a, b),
            )
          : Promise.resolve([] as InPersonOrder[]),
        phones.length > 0
          ? fetchAll<InPersonOrder>((a, b) =>
              db
                .from(table)
                .select(inPersonSelect)
                .in('customer_phone', phones)
                .in('status', statuses)
                .range(a, b),
            )
          : Promise.resolve([] as InPersonOrder[]),
      ]);

    const [allOnlineOrders, [popupByEmailData, popupByPhoneData], [walkinByEmailData, walkinByPhoneData]] =
      await Promise.all([
        userIds.length > 0
          ? fetchAll<any>((a, b) =>
              db
                .from('orders')
                .select('user_id, total, created_at')
                .in('user_id', userIds)
                .is('deleted_at', null)
                .in('status', ONLINE_REVENUE_STATUSES)
                .range(a, b),
            )
          : Promise.resolve([] as any[]),
        byEmailAndPhone('popup_orders', POPUP_REVENUE_STATUSES),
        byEmailAndPhone('walkin_orders', WALKIN_REVENUE_STATUSES),
      ]);

    // Deduplicate in-person orders (email + phone queries may return the same
    // row). Pop-up and walk-in share a customer key space, so they aggregate
    // together — one person buying at a pop-up and at HQ is one customer.
    const inPersonById = new Map<string, InPersonOrder>();
    for (const po of [
      ...popupByEmailData,
      ...popupByPhoneData,
      ...walkinByEmailData,
      ...walkinByPhoneData,
    ]) {
      if (!inPersonById.has(po.id)) inPersonById.set(po.id, po);
    }
    const allPopupOrders = Array.from(inPersonById.values());

    // ── 3. Build per-profile aggregation maps ────────────────────────────────

    const onlineByUser = new Map<string, { total: number; count: number; lastDate: string }>();
    for (const o of allOnlineOrders) {
      const entry = onlineByUser.get(o.user_id) ?? { total: 0, count: 0, lastDate: '' };
      entry.total += Number(o.total);
      entry.count += 1;
      if (o.created_at > entry.lastDate) entry.lastDate = o.created_at;
      onlineByUser.set(o.user_id, entry);
    }

    const popupByEmailMap = new Map<string, { total: number; count: number; lastDate: string }>();
    const popupByPhoneMap = new Map<string, { total: number; count: number; lastDate: string }>();
    for (const po of allPopupOrders) {
      const email = po.customer_email?.toLowerCase();
      const phone = po.customer_phone;
      // Attribute to email first; only fall back to phone when no email present
      const key = email || phone;
      if (!key) continue;
      const map = email ? popupByEmailMap : popupByPhoneMap;
      const entry = map.get(key) ?? { total: 0, count: 0, lastDate: '' };
      entry.total += Number(po.total);
      entry.count += 1;
      if (po.created_at > entry.lastDate) entry.lastDate = po.created_at;
      map.set(key, entry);
    }

    // ── 4. Enrich each profile ───────────────────────────────────────────────

    const zero = { total: 0, count: 0, lastDate: '' };
    const enriched = profiles.map((profile) => {
      const normalizedPhone = toE164(profile.phone_number);
      const email = profile.email?.toLowerCase();

      const online = onlineByUser.get(profile.id) ?? zero;
      const popupE = email ? (popupByEmailMap.get(email) ?? zero) : zero;
      // Use phone-based popup only when the profile has no email (avoid double-counting)
      const popupP = !email && normalizedPhone ? (popupByPhoneMap.get(normalizedPhone) ?? zero) : zero;

      const irisOrderCount = online.count + popupE.count + popupP.count;
      const irisSpent = online.total + popupE.total + popupP.total;
      const shopifyOrders = profile.shopify_total_orders ?? 0;
      const shopifySpent = parseFloat(profile.shopify_total_spent ?? 0);

      const dates = [online.lastDate, popupE.lastDate, popupP.lastDate].filter(Boolean);
      const lastOrderDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

      return {
        ...profile,
        phone_number: normalizedPhone,
        order_count: irisOrderCount + shopifyOrders,
        iris_order_count: irisOrderCount,
        shopify_order_count: shopifyOrders,
        total_spent: irisSpent + shopifySpent,
        iris_total_spent: irisSpent,
        shopify_total_spent_amt: shopifySpent,
        last_order_date: lastOrderDate || null,
      };
    });

    // ── 5. Apply order-count filter and paginate ─────────────────────────────

    if (hasOrderFilter) {
      const min = query.min_orders !== undefined ? parseInt(query.min_orders, 10) : null;
      const max = query.max_orders !== undefined ? parseInt(query.max_orders, 10) : null;

      const filtered = enriched.filter((c) => {
        if (min !== null && c.order_count < min) return false;
        if (max !== null && c.order_count > max) return false;
        return true;
      });

      const total = filtered.length;
      const start = (page - 1) * limit;
      const pageData = filtered.slice(start, start + limit);

      return { data: pageData, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    return { data: enriched, total: dbCount, page, limit, totalPages: Math.ceil(dbCount / limit) };
  }

  async findAdminCustomer(customerId: string) {
    const db = this.supabase.getAdminClient();

    const { data: profile, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Customer not found');
    }

    const normalizedPhone = toE164(profile.phone_number);

    // Iris online orders (with items for the timeline)
    const { data: orders } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Spend counts revenue-status orders only, matching the customer list and
    // every analytics metric. The old blacklist (everything but cancelled and
    // refunded) counted never-paid `pending` checkout attempts as spend.
    const revenueOrders = (orders || []).filter((o) =>
      ONLINE_REVENUE_STATUSES.includes(o.status),
    );
    const irisOnlineSpent = revenueOrders.reduce(
      (sum, o) => sum + Number(o.total ?? 0),
      0,
    );

    // Pop-up and walk-in orders matched by email or phone. PostgREST treats
    // `,` `(` `)` as `or()` syntax, so the values are escaped before use.
    const orValue = (v: string) => `"${v.replace(/["\\]/g, '\\$&')}"`;
    const inPersonConditions: string[] = [];
    if (profile.email) inPersonConditions.push(`customer_email.eq.${orValue(profile.email)}`);
    if (normalizedPhone) inPersonConditions.push(`customer_phone.eq.${orValue(normalizedPhone)}`);

    const matchInPerson = async (
      table: 'popup_orders' | 'walkin_orders',
      select: string,
      statuses: string[],
    ) => {
      if (inPersonConditions.length === 0) return [] as any[];
      return fetchAll<any>((a, b) =>
        db
          .from(table)
          .select(select)
          .or(inPersonConditions.join(','))
          .in('status', statuses)
          .order('created_at', { ascending: false })
          .range(a, b),
      );
    };

    const [popupOrders, walkinOrders] = await Promise.all([
      matchInPerson(
        'popup_orders',
        'id, order_number, total, status, payment_method, created_at, popup_events(name)',
        POPUP_REVENUE_STATUSES,
      ),
      matchInPerson(
        'walkin_orders',
        'id, order_number, total, status, payment_method, created_at, walkin_order_items(product_name, variant_title, quantity, unit_price, total_price)',
        WALKIN_REVENUE_STATUSES,
      ),
    ]);

    // Deduplicate by ID (an email+phone match can return the same order twice)
    const dedupe = (rows: any[]) => {
      const seen = new Set<string>();
      return rows.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    };
    const uniquePopupOrders = dedupe(popupOrders);
    const uniqueWalkinOrders = dedupe(walkinOrders);

    const sumTotal = (rows: any[]) =>
      rows.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const popupSpent = sumTotal(uniquePopupOrders);
    const walkinSpent = sumTotal(uniqueWalkinOrders);

    // Historical Shopify data
    const shopifyOrders = profile.shopify_total_orders ?? 0;
    const shopifySpent = parseFloat(profile.shopify_total_spent ?? 0);

    // Billing address: prefer most recent order's billing_address, then shipping_address, then default_address
    const recentOrderWithAddress = (orders || []).find(
      (o) => o.billing_address || o.shipping_address,
    );
    const billingAddress =
      recentOrderWithAddress?.billing_address ||
      recentOrderWithAddress?.shipping_address ||
      profile.default_address ||
      null;

    return {
      ...profile,
      phone_number: normalizedPhone,
      // Iris orders (full objects for timeline). `orders` keeps every status so
      // the timeline still shows abandoned/cancelled attempts; only the spend
      // and count figures are restricted to revenue statuses.
      orders: orders || [],
      popup_orders: uniquePopupOrders,
      walkin_orders: uniqueWalkinOrders,
      // Aggregated spend including Shopify history
      iris_order_count:
        revenueOrders.length + uniquePopupOrders.length + uniqueWalkinOrders.length,
      shopify_order_count: shopifyOrders,
      order_count:
        revenueOrders.length +
        uniquePopupOrders.length +
        uniqueWalkinOrders.length +
        shopifyOrders,
      iris_total_spent: round2(irisOnlineSpent + popupSpent + walkinSpent),
      shopify_total_spent_amt: shopifySpent,
      total_spent: round2(irisOnlineSpent + popupSpent + walkinSpent + shopifySpent),
      // Metadata
      billing_address: billingAddress,
      default_address: profile.default_address,
      tags: profile.tags ?? [],
      shopify_customer_id: profile.shopify_customer_id,
      migrated_from: profile.migrated_from,
    };
  }

  async getCustomerStats() {
    const db = this.supabase.getAdminClient();

    // Total customers (role = 'public' or unset — excludes admin/staff/manager)
    const { count: totalCustomers } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.public,role.is.null');

    // New this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.public,role.is.null')
      .gte('created_at', startOfMonth.toISOString());

    // Revenue-status orders only, paged — matching the customer list, the
    // detail view and analytics. The old blacklist counted never-paid `pending`
    // checkout attempts toward AOV and top spender.
    const allOrders = await fetchAll<any>((a, b) =>
      db
        .from('orders')
        .select('user_id, total, email')
        .is('deleted_at', null)
        .in('status', ONLINE_REVENUE_STATUSES)
        .range(a, b),
    );

    // Avg order value
    const avgOrderValue =
      allOrders.length > 0
        ? round2(
            allOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0) /
              allOrders.length,
          )
        : 0;

    // Top spender
    const spendByUser: Record<string, { email: string; amount: number }> = {};
    allOrders.forEach((o) => {
      if (!o.user_id) return;
      if (!spendByUser[o.user_id]) {
        spendByUser[o.user_id] = { email: o.email, amount: 0 };
      }
      spendByUser[o.user_id].amount += Number(o.total ?? 0);
    });

    // Also add pop-up and walk-in spend, matched back to profiles by email
    const [allPopupOrders, allWalkinOrders] = await Promise.all([
      fetchAll<any>((a, b) =>
        db
          .from('popup_orders')
          .select('customer_email, total')
          .in('status', POPUP_REVENUE_STATUSES)
          .not('customer_email', 'is', null)
          .range(a, b),
      ),
      fetchAll<any>((a, b) =>
        db
          .from('walkin_orders')
          .select('customer_email, total')
          .in('status', WALKIN_REVENUE_STATUSES)
          .not('customer_email', 'is', null)
          .range(a, b),
      ),
    ]);

    const inPersonSpendByEmail: Record<string, number> = {};
    [...allPopupOrders, ...allWalkinOrders].forEach((po) => {
      const email = po.customer_email?.toLowerCase();
      if (!email) return;
      inPersonSpendByEmail[email] =
        (inPersonSpendByEmail[email] || 0) + Number(po.total ?? 0);
    });

    for (const data of Object.values(spendByUser)) {
      const extra = inPersonSpendByEmail[data.email?.toLowerCase() ?? ''] || 0;
      if (extra > 0) data.amount += extra;
    }

    let topSpender: { name: string; amount: number } | null = null;
    const entries = Object.entries(spendByUser);
    if (entries.length > 0) {
      const [userId, best] = entries.sort(
        (a, b) => b[1].amount - a[1].amount,
      )[0];

      // Try to get their name from profiles
      const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
          best.email
        : best.email;

      topSpender = { name, amount: round2(best.amount) };
    }

    return {
      totalCustomers: totalCustomers || 0,
      newThisMonth: newThisMonth || 0,
      avgOrderValue,
      topSpender,
    };
  }

  async getAnalytics(query: { from_date?: string; to_date?: string }) {
    const db = this.supabase.getAdminClient();

    const fromDate =
      query.from_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = query.to_date || new Date().toISOString();

    // Every query here pages via `fetchAll` — the dashboard requests the whole
    // history (from_date=2020-01-01) for the brushable all-time chart, and a
    // bare select silently stops at PostgREST's 1000-row ceiling, truncating
    // the chart, the brand split and the totals without any error.
    const orders = await fetchAll<any>((a, b) =>
      db
        .from('orders')
        .select('total, status, created_at')
        .is('deleted_at', null)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: true })
        .range(a, b),
    );

    const revenueByDay: Record<string, number> = {};
    const ordersByDay: Record<string, number> = {};

    const addToDay = (createdAt: string, total: unknown) => {
      const day = dayOf(createdAt);
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(total ?? 0);
    };

    let onlineRevenue = 0;
    let onlineOrderCount = 0;
    orders.forEach((o) => {
      if (!ONLINE_REVENUE_STATUSES.includes(o.status)) return;
      addToDay(o.created_at, o.total);
      onlineRevenue += Number(o.total ?? 0);
      onlineOrderCount += 1;
    });

    // ── Pop-up + walk-in: fold into the combined revenueByDay / ordersByDay ───
    const [popupOrdersData, walkinOrdersData] = await Promise.all([
      fetchAll<any>((a, b) =>
        db
          .from('popup_orders')
          .select('total, status, created_at')
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .in('status', POPUP_REVENUE_STATUSES)
          .range(a, b),
      ),
      fetchAll<any>((a, b) =>
        db
          .from('walkin_orders')
          .select('total, status, created_at')
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .in('status', WALKIN_REVENUE_STATUSES)
          .range(a, b),
      ),
    ]);

    let popupRevenue = 0;
    let popupOrderCount = 0;
    popupOrdersData.forEach((po) => {
      addToDay(po.created_at, po.total);
      popupRevenue += Number(po.total ?? 0);
      popupOrderCount += 1;
    });

    let walkinRevenue = 0;
    let walkinOrderCount = 0;
    walkinOrdersData.forEach((wo) => {
      addToDay(wo.created_at, wo.total);
      walkinRevenue += Number(wo.total ?? 0);
      walkinOrderCount += 1;
    });

    // Previous period comparison
    const fromMs = new Date(fromDate).getTime();
    const toMs = new Date(toDate).getTime();
    const periodLength = toMs - fromMs;
    const prevFrom = new Date(fromMs - periodLength).toISOString();
    // Ends 1ms before `fromDate` so a boundary order isn't in both windows.
    const prevTo = new Date(fromMs - 1).toISOString();

    const [prevOrders, prevPopupOrders, prevWalkinOrders] = await Promise.all([
      fetchAll<any>((a, b) =>
        db
          .from('orders')
          .select('total, status')
          .is('deleted_at', null)
          .in('status', ONLINE_REVENUE_STATUSES)
          .gte('created_at', prevFrom)
          .lte('created_at', prevTo)
          .range(a, b),
      ),
      fetchAll<any>((a, b) =>
        db
          .from('popup_orders')
          .select('total, status')
          .gte('created_at', prevFrom)
          .lte('created_at', prevTo)
          .in('status', POPUP_REVENUE_STATUSES)
          .range(a, b),
      ),
      fetchAll<any>((a, b) =>
        db
          .from('walkin_orders')
          .select('total, status')
          .gte('created_at', prevFrom)
          .lte('created_at', prevTo)
          .in('status', WALKIN_REVENUE_STATUSES)
          .range(a, b),
      ),
    ]);

    // Previous period uses the same revenue-status whitelist as the current
    // period so the delta badges compare like for like, across all channels.
    const sumTotals = (rows: any[]) =>
      rows.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const previousPeriodRevenue =
      sumTotals(prevOrders) + sumTotals(prevPopupOrders) + sumTotals(prevWalkinOrders);
    const previousPeriodOrders =
      prevOrders.length + prevPopupOrders.length + prevWalkinOrders.length;

    // Funnel counts from current orders
    const validOrders = orders.filter((o) =>
      ONLINE_REVENUE_STATUSES.includes(o.status),
    );
    const funnelStages = ['paid', 'processing', 'shipped', 'delivered'];
    const stagePriority: Record<string, number> = {
      paid: 0,
      processing: 1,
      shipped: 2,
      delivered: 3,
    };
    const funnelCounts: Record<string, number> = {};
    funnelStages.forEach((stage) => {
      funnelCounts[stage] = validOrders.filter(
        (o) => (stagePriority[o.status] ?? -1) >= stagePriority[stage],
      ).length;
    });

    // Top products by revenue
    const topItems = await fetchAll<any>((a, b) =>
      db
        .from('order_items')
        .select('order_id, product_id, product_name, quantity, total_price, order:orders!inner(status, created_at, deleted_at), product:products(vendor)')
        .gte('orders.created_at', fromDate)
        .lte('orders.created_at', toDate)
        .in('orders.status', ONLINE_REVENUE_STATUSES)
        .is('orders.deleted_at', null)
        .range(a, b),
    );

    const productMap: Record<
      string,
      { name: string; revenue: number; unitsSold: number; productId: string | null; vendor: string | null }
    > = {};
    topItems.forEach((item: any) => {
      const name = item.product_name;
      if (!productMap[name]) {
        productMap[name] = { name, revenue: 0, unitsSold: 0, productId: item.product_id || null, vendor: item.product?.vendor || null };
      }
      productMap[name].revenue += Number(item.total_price);
      productMap[name].unitsSold += item.quantity;
    });

    // ── Brand revenue breakdown ────────────────────────────────────────────────
    // Computed from storefront order items (vendor via products table)
    const brandRevenue: Record<string, number> = {};
    const brandRevenueByDay: Record<string, Record<string, number>> = {};
    const brandOrders: Record<string, Set<string>> = {};

    const applyVendorMetrics = (
      vendor: string,
      amount: number,
      day: string | undefined,
      orderId: string,
    ) => {
      brandRevenue[vendor] = (brandRevenue[vendor] || 0) + amount;
      if (day) {
        if (!brandRevenueByDay[vendor]) brandRevenueByDay[vendor] = {};
        brandRevenueByDay[vendor][day] =
          (brandRevenueByDay[vendor][day] || 0) + amount;
      }
      if (!brandOrders[vendor]) brandOrders[vendor] = new Set();
      brandOrders[vendor].add(orderId);
    };

    topItems.forEach((item: any) => {
      applyVendorMetrics(
        item.product?.vendor || '1NRI',
        Number(item.total_price),
        item.order?.created_at ? dayOf(item.order.created_at) : undefined,
        `online_${item.order_id}`,
      );
    });

    // Also attribute pop-up and walk-in items to vendors, so the brand split
    // covers the same channels as the revenue KPI above it.
    const [popupItemsBrand, walkinItemsBrand] = await Promise.all([
      fetchAll<any>((a, b) =>
        db
          .from('popup_order_items')
          .select('order_id, total_price, product:products(vendor), order:popup_orders!inner(created_at, status)')
          .gte('popup_orders.created_at', fromDate)
          .lte('popup_orders.created_at', toDate)
          .in('popup_orders.status', POPUP_REVENUE_STATUSES)
          .range(a, b),
      ),
      fetchAll<any>((a, b) =>
        db
          .from('walkin_order_items')
          .select('walkin_order_id, total_price, product:products(vendor), order:walkin_orders!inner(created_at, status)')
          .gte('walkin_orders.created_at', fromDate)
          .lte('walkin_orders.created_at', toDate)
          .in('walkin_orders.status', WALKIN_REVENUE_STATUSES)
          .range(a, b),
      ),
    ]);

    popupItemsBrand.forEach((item: any) => {
      applyVendorMetrics(
        item.product?.vendor || '1NRI',
        Number(item.total_price),
        item.order?.created_at ? dayOf(item.order.created_at) : undefined,
        `popup_${item.order_id}`,
      );
    });

    walkinItemsBrand.forEach((item: any) => {
      applyVendorMetrics(
        item.product?.vendor || '1NRI',
        Number(item.total_price),
        item.order?.created_at ? dayOf(item.order.created_at) : undefined,
        `walkin_${item.walkin_order_id}`,
      );
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);

    // Batch-fetch product images for top products
    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    let imageMap: Record<string, string> = {};
    if (productIds.length > 0) {
      // product_images uses `src` as the image URL column, ordered by `position`
      const { data: images } = await db
        .from('product_images')
        .select('product_id, src')
        .in('product_id', productIds)
        .eq('position', 1);

      (images || []).forEach((img: any) => {
        if (!imageMap[img.product_id]) {
          imageMap[img.product_id] = img.src;
        }
      });
    }

    const topProductsWithImages = topProducts.map((p) => ({
      ...p,
      imageUrl: p.productId ? imageMap[p.productId] || null : null,
    }));

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    orders.forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    });

    const brandOrderCount: Record<string, number> = {};
    for (const [vendor, orderSet] of Object.entries(brandOrders)) {
      brandOrderCount[vendor] = orderSet.size;
    }

    return {
      revenueByDay,
      ordersByDay,
      topProducts: topProductsWithImages,
      statusBreakdown,
      totalOrders: onlineOrderCount + popupOrderCount + walkinOrderCount,
      totalRevenue: round2(onlineRevenue + popupRevenue + walkinRevenue),
      previousPeriodRevenue,
      previousPeriodOrders,
      funnelCounts,
      brandRevenue,
      brandRevenueByDay,
      brandOrderCount,
      // Per-channel figures are returned explicitly. The dashboard used to
      // derive "online" by subtracting popup from the total, which silently
      // absorbed any newly added channel into the online slice.
      channelRevenue: {
        online: round2(onlineRevenue),
        popup: round2(popupRevenue),
        walkin: round2(walkinRevenue),
      },
      channelOrders: {
        online: onlineOrderCount,
        popup: popupOrderCount,
        walkin: walkinOrderCount,
      },
    };
  }

  // --- Revenue Targets ---

  async getRevenueTarget(year: number) {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('revenue_targets')
      .select('target')
      .eq('year', year);
    
    const target = data && data.length > 0 ? Number(data[0].target) : null;
    return { target };
  }

  async setRevenueTarget(year: number, target: number) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('revenue_targets')
      .upsert({ year, target, updated_at: new Date().toISOString() })
      .select('target')
      .single();
    
    if (error) {
      console.error('Failed to set revenue target:', error);
      throw new Error(`DB Error: ${error.message}`);
    }
    return { target: Number(data.target) };
  }

  /**
   * Create an order in `pending` state BEFORE payment is initiated.
   * Validates stock and inserts order + items, but does not deduct inventory yet.
   * Idempotent: returns the existing order if one already exists for the same
   * payment_reference (so retries / double-clicks are safe).
   */
  async createPending(dto: CreateOrderDto, userId: string | null, email: string | null) {
    const resolvedEmail = email ?? dto.guestEmail ?? '';
    if (!resolvedEmail) {
      throw new BadRequestException('Email is required for guest checkout');
    }
    if (dto.shippingAddress?.phone) {
      dto.shippingAddress.phone = toE164(dto.shippingAddress.phone) ?? dto.shippingAddress.phone;
    }

    const db = this.supabase.getAdminClient();

    // Idempotency: if an order with this reference already exists, return it.
    const { data: existing } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('payment_reference', dto.paymentReference)
      .maybeSingle();
    if (existing) return existing;

    // 1. Reject items whose product is no longer purchasable, then validate stock.
    await this.assertProductsPurchasable(
      db,
      dto.items.map((i) => i.variantId),
    );

    for (const item of dto.items) {
      const { data: variant, error } = await db
        .from('product_variants')
        .select('id, inventory_quantity, sku')
        .eq('id', item.variantId)
        .single();

      if (error || !variant) {
        throw new BadRequestException(`Variant ${item.variantId} not found`);
      }

      if (variant.inventory_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.productTitle}". Available: ${variant.inventory_quantity}`,
        );
      }
    }

    // 2. Calculate totals
    const subtotal = dto.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const shippingCost = await this.resolveShippingCost(dto);

    // 2b. Resolve discounts through the shared engine. A typed code and any
    // auto-applied pairing rules compete and the larger one wins; the engine
    // recomputes the subtotal from the line items, so nothing here trusts a
    // client-supplied amount. An invalid typed code throws.
    const discount = await this.discountEngine.resolve({
      channel: 'online',
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        unitPrice: i.price,
        quantity: i.quantity,
      })),
      shippingCost,
      code: dto.promoCode,
    });
    const discountAmount = discount.discountAmount;
    const appliedPromoCodeId = discount.promoCodeId;

    const amountBeforeFees = Math.max(0, subtotal + shippingCost - discountAmount);
    const processingFee = Math.round(amountBeforeFees * PROCESSING_FEE_RATE * 100) / 100;
    const total = amountBeforeFees + processingFee;

    // 3. Generate order number
    const orderNumber = await this.generateOrderNumber();

    const guestToken = !userId ? crypto.randomUUID() : null;

    // 4. Insert order as pending
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        email: resolvedEmail,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        discount: discountAmount,
        shipping_cost: shippingCost,
        processing_fee: processingFee,
        total,
        currency: 'GHS',
        shipping_address: dto.shippingAddress,
        shipping_method: dto.shippingMethod || 'standard',
        payment_provider: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'pending',
        applied_promo_code_id: appliedPromoCodeId,
        guest_token: guestToken,
      })
      .select()
      .single();

    if (orderError || !order) throw new Error(orderError?.message || 'Failed to create order');

    await this.reserveDiscount(discount, order, {
      email: resolvedEmail,
      userId,
    });

    // 5. Insert order items
    const orderItems = dto.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productTitle,
      variant_title: item.variantTitle || null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await db.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    const result = await this.findOne(order.id);
    return { ...result, guest_token: guestToken };
  }

  async findGuestOrder(orderNumber: string, token: string) {
    if (!token) throw new NotFoundException('Order not found');
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), preorders(*)')
      .eq('order_number', orderNumber)
      .eq('guest_token', token)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async trackOrderByEmail(orderNumber: string, email: string) {
    if (!orderNumber || !email) throw new NotFoundException('Order not found');
    const db = this.supabase.getAdminClient();
    const normalized = orderNumber.trim().toUpperCase();

    // Preorders live in a separate table with their own status flow. Route
    // PRE- numbers there so customers can track paid preorders publicly too.
    if (normalized.startsWith('PRE-')) {
      // A single PRE- number can span multiple pre-order rows (a popup order
      // with several lines), so fetch them all and present one grouped result.
      const { data: rows, error } = await db
        .from('preorders')
        .select('order_number, status, payment_status, product_name, variant_title, quantity, unit_price, created_at, updated_at, notified_at')
        .eq('order_number', normalized)
        .ilike('customer_email', email.trim())
        .order('created_at', { ascending: true });

      if (error || !rows || rows.length === 0)
        throw new NotFoundException('Order not found');

      const first = rows[0];
      // Shape it like the order tracking payload so the frontend can share the
      // item list rendering.
      return {
        kind: 'preorder' as const,
        order_number: first.order_number,
        status: this.derivePreorderGroupStatus(rows),
        payment_status: first.payment_status,
        created_at: first.created_at,
        notified_at: rows.map((r) => r.notified_at).find(Boolean) ?? null,
        items: rows.map((r) => ({
          product_name: r.product_name,
          variant_title: r.variant_title,
          quantity: r.quantity,
          total_price: Number(r.unit_price) * r.quantity,
        })),
      };
    }

    const { data, error } = await db
      .from('orders')
      .select('order_number, status, payment_status, tracking_number, carrier, shipped_at, delivered_at, created_at, shipping_address, shipping_method, pickup_date, order_items(product_name, variant_title, quantity, total_price), preorders(product_name, variant_title, quantity, unit_price, status)')
      .eq('order_number', normalized)
      .ilike('email', email.trim())
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return { kind: 'order' as const, ...data };
  }

  /**
   * Mark an order as paid by its payment_reference.
   * Idempotent: safe to call multiple times (frontend success callback +
   * Paystack webhook). Deducts inventory exactly once on the first transition
   * to paid.
   */
  async confirmPayment(paymentReference: string) {
    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('orders')
      .select('id, payment_status, order_number, user_id, applied_promo_code_id, order_items(*)')
      .eq('payment_reference', paymentReference)
      .maybeSingle();

    if (error || !order) return null; // Order not found — might not exist yet
    if (order.payment_status === 'paid') {
      return this.findOne(order.id); // Already confirmed
    }

    // Flip to paid then immediately to processing
    const { error: updateError } = await db
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Log payment confirmation then advance to processing
    await db.from('order_status_history').insert([
      { order_id: order.id, from_status: 'pending', to_status: 'paid', notes: 'Payment confirmed' },
      { order_id: order.id, from_status: 'paid', to_status: 'processing', notes: 'Auto-advanced after payment confirmation' },
    ]);

    await db
      .from('orders')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    // Deduct inventory — this is where the stock hold becomes a real,
    // permanent deduction. Failures are logged but do not throw so the
    // order is never left unconfirmed because of an inventory hiccup.
    try {
      for (const item of order.order_items || []) {
        const { data: variant } = await db
          .from('product_variants')
          .select('inventory_quantity')
          .eq('id', item.variant_id)
          .single();

        const previousQty = variant?.inventory_quantity ?? 0;
        const newQty = Math.max(0, previousQty - item.quantity);

        await db
          .from('product_variants')
          .update({ inventory_quantity: newQty })
          .eq('id', item.variant_id);

        await db.from('inventory_movements').insert({
          variant_id: item.variant_id,
          quantity_change: -item.quantity,
          quantity_before: previousQty,
          quantity_after: newQty,
          movement_type: 'sale',
          notes: `Order ${order.order_number}`,
          created_by: order.user_id,
        });
      }
    } catch (inventoryError) {
      console.error(
        `Inventory deduction failed for order ${order.order_number}:`,
        inventoryError,
      );
    }

    // Mark any pre-order lines paid through this same payment and fire their
    // confirmation notifications. Idempotent (only flips rows still pending).
    try {
      await this.preordersService.markOrderPreordersPaid(order.id);
    } catch (preorderError) {
      console.error(
        `Marking pre-orders paid failed for order ${order.order_number}:`,
        preorderError,
      );
    }

    // Cash in the usage seat reserved at order creation. Idempotent, so a
    // replayed webhook cannot double-count.
    this.discountEngine
      .confirmForOrder('orders', order.id)
      .catch((err) => {
        console.error(
          `Failed to confirm promo redemption for order ${order.order_number}:`,
          err,
        );
      });

    // Fetch full order to get items, email, and phone for notifications
    let fullOrder: any;
    try {
      fullOrder = await this.findOne(order.id);

      // Derive brand from item vendors: Unlikely Alliances if all items are UA, else 1NRI
      const vendors: string[] = (fullOrder.order_items || [])
        .map((i: any) => (i.product?.vendor as string) || '1NRI');
      const brand = vendors.length > 0 && vendors.every((v) => v === 'Unlikely Alliances')
        ? 'Unlikely Alliances'
        : '1NRI';

      // Collection details for a pop-up pickup order, resolved from the date
      // stored on the order (not recomputed) so the emails always name the same
      // pop-up the customer was shown and the order is filed against.
      const pickupConfig =
        fullOrder.shipping_method === 'popup_pickup'
          ? await this.settingsService.getPopupPickup()
          : null;
      const pickup = pickupConfig
        ? {
            dateLabel: formatPickupDate(fullOrder.pickup_date),
            location: pickupConfig.location,
            note: pickupConfig.note,
          }
        : null;

      // An all-pre-order checkout has no in-stock order items — it's just a
      // payment/shipping container. Skip the generic "your order" emails/SMS in
      // that case; the pre-order confirmations already went out via
      // markOrderPreordersPaid above.
      if ((fullOrder.order_items || []).length > 0) {
      // Email receipt — fire and forget
      this.emailService
        .sendOrderConfirmation({
          email: fullOrder.email,
          order_number: fullOrder.order_number,
          subtotal: fullOrder.subtotal,
          shipping_cost: fullOrder.shipping_cost || 0,
          processing_fee: fullOrder.processing_fee || 0,
          total: fullOrder.total,
          currency: fullOrder.currency || 'GHS',
          brand,
          pickup,
          order_items: fullOrder.order_items,
        })
        .catch(() => null);

      // Staff fulfillment notification — fire and forget
      this.emailService
        .sendStaffOrderNotification({
          email: fullOrder.email,
          order_number: fullOrder.order_number,
          subtotal: fullOrder.subtotal,
          shipping_cost: fullOrder.shipping_cost || 0,
          processing_fee: fullOrder.processing_fee || 0,
          total: fullOrder.total,
          currency: fullOrder.currency || 'GHS',
          shipping_address: fullOrder.shipping_address as any,
          shipping_method: fullOrder.shipping_method,
          pickup,
          placed_at: fullOrder.created_at,
          order_items: fullOrder.order_items,
        })
        .catch(() => null);

      // SMS confirmation — fire and forget
      const phone = toE164(
        (fullOrder.shipping_address as any)?.phone,
      );
      if (phone) {
        this.smsService
          .sendSMS(phone, SMS_TEMPLATES.orderConfirmation(fullOrder.order_number, `${this.frontendUrl}/track?order=${fullOrder.order_number}`))
          .catch(() => null);
      }
      }
    } catch (notifyErr: any) {
      // Notification failures must never block payment confirmation
      console.error('Notification error after payment confirm:', notifyErr?.message);
    }

    return fullOrder ?? null;
  }

  /**
   * Ask Paystack whether a reference was actually charged. Returns the
   * transaction status string ('success' | 'failed' | 'abandoned' | ...), or
   * null if the lookup itself failed (network/HTTP error) so the caller can
   * safely skip and retry on the next tick.
   */
  private async verifyPaystackTransaction(
    reference: string,
  ): Promise<string | null> {
    if (!this.paystackSecretKey) return null;
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${this.paystackSecretKey}` } },
      );
      if (!response.ok) return null;
      const result = (await response.json()) as any;
      return result?.data?.status ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Safety net for the two ways a paid order can get stuck as `pending`:
   * the client-side confirm callback never fired AND the webhook was missed.
   * Runs on a schedule (see OrdersReconciliationCron).
   *
   * For each still-pending, unpaid order older than the grace window we ask
   * Paystack for the truth:
   *   - success                          → confirmPayment() recovers the sale
   *   - unpaid AND older than DELETE age  → soft-delete (dead abandoned attempt)
   *   - unpaid but still young            → leave it, retry next tick
   * Every order is handled independently so one failure can't stall the batch.
   */
  async reconcilePendingOrders(): Promise<{ recovered: number; cleaned: number }> {
    const db = this.supabase.getAdminClient();
    const now = Date.now();
    const graceCutoff = new Date(now - RECONCILE_GRACE_MS).toISOString();

    const { data: rows, error } = await db
      .from('orders')
      .select('id, payment_reference, order_number, created_at')
      .is('deleted_at', null)
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .not('payment_reference', 'is', null)
      .lt('created_at', graceCutoff)
      .order('created_at', { ascending: true })
      .limit(RECONCILE_BATCH_SIZE);

    if (error) throw error;
    if (!rows?.length) return { recovered: 0, cleaned: 0 };

    let recovered = 0;
    let cleaned = 0;

    for (const order of rows) {
      try {
        const status = await this.verifyPaystackTransaction(order.payment_reference);
        if (status === null) continue; // lookup failed — retry next tick

        if (status === 'success') {
          // Idempotent: deducts inventory, sends receipts, flips to paid/processing.
          await this.confirmPayment(order.payment_reference);
          recovered += 1;
          continue;
        }

        const age = now - new Date(order.created_at).getTime();
        if (age > RECONCILE_DELETE_AFTER_MS) {
          await db
            .from('orders')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', order.id)
            .eq('payment_status', 'pending'); // guard: never soft-delete a paid order
          cleaned += 1;
        }
      } catch (err: any) {
        console.error(
          `reconcilePendingOrders failed for ${order.order_number}:`,
          err?.message ?? err,
        );
      }
    }

    return { recovered, cleaned };
  }
}
