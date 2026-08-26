import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import {
  SettingsService,
  formatPickupDate,
} from '../settings/settings.service';
import { ONLINE_REVENUE_STATUSES } from '../analytics/analytics.constants';

/** Statuses where the customer has paid and the order is still to be handed over. */
const AWAITING_STATUSES = ONLINE_REVENUE_STATUSES.filter(
  (s) => s !== 'delivered',
);

export interface PickupCollection {
  id: string;
  order_number: string;
  status: string;
  email: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_date: string | null;
  pickup_date_label: string;
  total: number;
  collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  pickup_reminder_sent_at: string | null;
  created_at: string;
  items: {
    product_name: string;
    variant_title: string | null;
    quantity: number;
    is_preorder: boolean;
  }[];
}

/**
 * Storefront pre-orders that chose "collect at the pop-up" instead of delivery.
 *
 * These live in `orders`, not `popup_orders` — they were paid for online days
 * earlier and are only *handed over* at the stand. This service is what makes
 * them visible to whoever is working the event, and records the hand-over.
 */
@Injectable()
export class PopupCollectionsService {
  private readonly logger = new Logger(PopupCollectionsService.name);

  constructor(
    private supabase: SupabaseService,
    private emailService: EmailService,
    private smsService: SmsService,
    private settingsService: SettingsService,
  ) {}

  // ─── Listing ───────────────────────────────────────────────────────────────

  /**
   * Every pickup order due at this event.
   *
   * Matched two ways on purpose: orders placed since the event existed carry
   * `popup_event_id` directly, while anything older (or booked before the event
   * row was created) is caught by its `pickup_date` falling inside the event's
   * date range. Without the date fallback, the list would be empty for every
   * order placed before this feature shipped.
   */
  async listForEvent(eventId: string): Promise<{
    event: { id: string; name: string; event_date: string | null; end_date: string | null; location: string | null };
    awaiting: PickupCollection[];
    collected: PickupCollection[];
  }> {
    const db = this.supabase.getAdminClient();

    const { data: event } = await db
      .from('popup_events')
      .select('id, name, event_date, end_date, location')
      .eq('id', eventId)
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found');

    const firstDay = event.event_date;
    const lastDay = event.end_date ?? event.event_date;

    let query = db
      .from('orders')
      .select(
        `id, order_number, status, email, shipping_address, pickup_date, total,
         collected_at, collected_by, pickup_reminder_sent_at, created_at,
         collected_by_profile:profiles!orders_collected_by_fkey (first_name, last_name),
         order_items (product_name, variant_title, quantity)`,
      )
      .eq('shipping_method', 'popup_pickup')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // An event with no date can only be matched by explicit id.
    query = firstDay
      ? query.or(
          `popup_event_id.eq.${eventId},and(popup_event_id.is.null,pickup_date.gte.${firstDay},pickup_date.lte.${lastDay})`,
        )
      : query.eq('popup_event_id', eventId);

    const { data: orders, error } = await query;
    if (error) throw error;

    // Pre-order lines live in their own table, so an all-pre-order checkout has
    // no order_items at all. Pull them in or the list would show empty baskets.
    const orderIds = (orders ?? []).map((o: any) => o.id);
    const preordersByOrder = await this.loadPreorders(orderIds);

    const rows = (orders ?? []).map((o: any) =>
      this.toCollection(o, preordersByOrder.get(o.id) ?? []),
    );

    return {
      event,
      awaiting: rows.filter((r) => !r.collected_at),
      collected: rows.filter((r) => !!r.collected_at),
    };
  }

  private async loadPreorders(orderIds: string[]) {
    const byOrder = new Map<string, any[]>();
    if (orderIds.length === 0) return byOrder;

    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('preorders')
      .select('order_id, product_name, variant_title, quantity, status')
      .in('order_id', orderIds)
      .not('status', 'in', '("cancelled","refunded")');

    for (const p of data ?? []) {
      const list = byOrder.get(p.order_id) ?? [];
      list.push(p);
      byOrder.set(p.order_id, list);
    }
    return byOrder;
  }

  private toCollection(order: any, preorders: any[]): PickupCollection {
    const address = order.shipping_address ?? {};
    const profile = order.collected_by_profile;
    const collectedByName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
      : null;

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      email: order.email,
      customer_name:
        [address.firstName, address.lastName].filter(Boolean).join(' ') ||
        address.fullName ||
        null,
      customer_phone: address.phone ?? null,
      pickup_date: order.pickup_date,
      pickup_date_label: formatPickupDate(order.pickup_date),
      total: Number(order.total ?? 0),
      collected_at: order.collected_at,
      collected_by: order.collected_by,
      collected_by_name: collectedByName,
      pickup_reminder_sent_at: order.pickup_reminder_sent_at,
      created_at: order.created_at,
      items: [
        ...(order.order_items ?? []).map((i: any) => ({
          product_name: i.product_name,
          variant_title: i.variant_title ?? null,
          quantity: i.quantity,
          is_preorder: false,
        })),
        ...preorders.map((p: any) => ({
          product_name: p.product_name,
          variant_title: p.variant_title ?? null,
          quantity: p.quantity,
          is_preorder: true,
        })),
      ],
    };
  }

  // ─── Hand-over ─────────────────────────────────────────────────────────────

  /**
   * Records a hand-over at the stand: stamps the collection, closes the order
   * out as delivered, fulfils its pre-order lines, and sends the receipt.
   *
   * Idempotent — tapping "collected" twice on a busy stand must not fire two
   * confirmations at the customer.
   */
  async markCollected(orderId: string, staffId: string) {
    const db = this.supabase.getAdminClient();

    const { data: order } = await db
      .from('orders')
      .select(
        'id, order_number, status, email, shipping_address, pickup_date, total, collected_at, shipping_method',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (!order) throw new NotFoundException('Order not found');
    if (order.shipping_method !== 'popup_pickup') {
      throw new BadRequestException('This order is not a pop-up collection');
    }
    if (order.collected_at) {
      // Already handed over — return the current state rather than erroring, so
      // a double-tap is harmless.
      return this.findOne(orderId);
    }
    if (!AWAITING_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Only a paid order can be collected. This one is "${order.status}".`,
      );
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from('orders')
      .update({
        collected_at: now,
        collected_by: staffId,
        status: 'delivered',
        delivered_at: now,
        updated_at: now,
      })
      .eq('id', orderId);
    if (error) throw error;

    await db.from('order_status_history').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: 'delivered',
      notes: 'Collected at pop-up',
      changed_by: staffId,
    });

    // The pre-order lines this order paid for are now in the customer's hands.
    await db
      .from('preorders')
      .update({ status: 'fulfilled', updated_at: now })
      .eq('order_id', orderId)
      .in('status', ['pending', 'stock_held']);

    await this.sendCollectedNotifications(orderId, now).catch((err) =>
      this.logger.warn(
        `Collection notifications failed for ${order.order_number}: ${err.message}`,
      ),
    );

    return this.findOne(orderId);
  }

  /** Undo a hand-over recorded against the wrong customer. */
  async undoCollected(orderId: string, staffId: string) {
    const db = this.supabase.getAdminClient();
    const { data: order } = await db
      .from('orders')
      .select('id, order_number, collected_at')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) throw new NotFoundException('Order not found');
    if (!order.collected_at) return this.findOne(orderId);

    const now = new Date().toISOString();
    await db
      .from('orders')
      .update({
        collected_at: null,
        collected_by: null,
        status: 'paid',
        delivered_at: null,
        updated_at: now,
      })
      .eq('id', orderId);

    await db.from('order_status_history').insert({
      order_id: orderId,
      from_status: 'delivered',
      to_status: 'paid',
      notes: 'Collection undone',
      changed_by: staffId,
    });

    return this.findOne(orderId);
  }

  async findOne(orderId: string): Promise<PickupCollection> {
    const db = this.supabase.getAdminClient();
    const { data: order } = await db
      .from('orders')
      .select(
        `id, order_number, status, email, shipping_address, pickup_date, total,
         collected_at, collected_by, pickup_reminder_sent_at, created_at,
         collected_by_profile:profiles!orders_collected_by_fkey (first_name, last_name),
         order_items (product_name, variant_title, quantity)`,
      )
      .eq('id', orderId)
      .single();

    const preorders = await this.loadPreorders([orderId]);
    return this.toCollection(order, preorders.get(orderId) ?? []);
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  private async sendCollectedNotifications(orderId: string, collectedAt: string) {
    const collection = await this.findOne(orderId);
    const config = await this.settingsService.getPopupPickup();

    if (collection.email) {
      await this.emailService
        .sendPickupCollectedConfirmation({
          email: collection.email,
          customer_name: collection.customer_name,
          order_number: collection.order_number,
          collectedAtLabel: formatPickupDate(collectedAt.slice(0, 10)),
          location: config.location,
          items: collection.items,
          total: collection.total,
        })
        .catch(() => {});
    }

    if (collection.customer_phone) {
      await this.smsService
        .sendSMS(
          collection.customer_phone,
          SMS_TEMPLATES.pickupCollected(collection.order_number),
        )
        .catch(() => {});
    }
  }

  /**
   * The day-of nudge: every uncollected pickup order due today gets one email
   * and one SMS telling them to come and what to present.
   *
   * `pickup_reminder_sent_at` is both the record and the guard, so a restart or
   * an overlapping tick cannot double-send.
   */
  async sendDueReminders(): Promise<{ sent: number }> {
    const db = this.supabase.getAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: orders, error } = await db
      .from('orders')
      .select('id, order_number, email, shipping_address, pickup_date, status')
      .eq('shipping_method', 'popup_pickup')
      .eq('pickup_date', today)
      .is('collected_at', null)
      .is('pickup_reminder_sent_at', null)
      .is('deleted_at', null)
      .in('status', AWAITING_STATUSES);

    if (error) throw error;
    if (!orders?.length) return { sent: 0 };

    const config = await this.settingsService.getPopupPickup();
    const dateLabel = formatPickupDate(today);
    let sent = 0;

    for (const order of orders) {
      // Stamp first: a send that half-fails is better than one that repeats
      // every five minutes for the rest of the day.
      const { error: stampError } = await db
        .from('orders')
        .update({ pickup_reminder_sent_at: new Date().toISOString() })
        .eq('id', order.id)
        .is('pickup_reminder_sent_at', null);
      if (stampError) continue;

      const collection = await this.findOne(order.id);

      if (collection.email) {
        await this.emailService
          .sendPickupReminder({
            email: collection.email,
            customer_name: collection.customer_name,
            order_number: collection.order_number,
            dateLabel,
            location: config.location,
            note: config.note,
            items: collection.items,
          })
          .catch((err) =>
            this.logger.warn(
              `Pickup reminder email failed for ${order.order_number}: ${err.message}`,
            ),
          );
      }

      if (collection.customer_phone) {
        await this.smsService
          .sendSMS(
            collection.customer_phone,
            SMS_TEMPLATES.pickupReminder(
              collection.order_number,
              dateLabel,
              config.location,
            ),
          )
          .catch((err) =>
            this.logger.warn(
              `Pickup reminder SMS failed for ${order.order_number}: ${err.message}`,
            ),
          );
      }

      sent += 1;
    }

    return { sent };
  }
}
