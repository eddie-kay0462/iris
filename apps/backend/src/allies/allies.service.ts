import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { AllocateStockDto, ReturnStockDto } from './dto/allocate-stock.dto';
import { QueryAllySalesDto } from './dto/query-sales.dto';

@Injectable()
export class AlliesService {
  constructor(
    private supabase: SupabaseService,
    private inventory: InventoryService,
  ) {}

  /** Current stock an ally holds, joined to product/variant details. */
  async getAllocations(allyId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('ally_stock_allocations')
      .select(
        'id, variant_id, quantity_allocated, quantity_returned, quantity_sold, on_hand, updated_at, ' +
          'variant:product_variants!inner(sku, price, option1_value, option2_value, option3_value, ' +
          'product:products!inner(id, title))',
      )
      .eq('ally_id', allyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: r.id,
      variantId: r.variant_id,
      productId: r.variant?.product?.id ?? null,
      productTitle: r.variant?.product?.title ?? null,
      variantTitle: this.variantTitle(r.variant),
      sku: r.variant?.sku ?? null,
      price: r.variant?.price != null ? Number(r.variant.price) : null,
      quantityAllocated: r.quantity_allocated,
      quantityReturned: r.quantity_returned,
      quantitySold: r.quantity_sold,
      onHand: r.on_hand,
      updatedAt: r.updated_at,
    }));
  }

  /** Allocate central stock to an ally (consignment): deduct central inventory
   *  with a logged 'transfer' movement, then track the ally's holding. */
  async allocate(allyId: string, dto: AllocateStockDto, userId: string) {
    const db = this.supabase.getAdminClient();

    await this.assertAllyExists(allyId);

    const { data: variant, error: vErr } = await db
      .from('product_variants')
      .select('id, inventory_quantity')
      .eq('id', dto.variantId)
      .single();
    if (vErr || !variant) throw new NotFoundException('Variant not found');

    if (dto.quantity > (variant.inventory_quantity ?? 0)) {
      throw new BadRequestException(
        `Only ${variant.inventory_quantity ?? 0} unit(s) available to allocate`,
      );
    }

    // Deduct central inventory + log the transfer (reuses inventory logic).
    await this.inventory.adjustStock(
      {
        variant_id: dto.variantId,
        quantity_change: -dto.quantity,
        movement_type: 'transfer',
        notes: dto.notes ?? `Allocated to ally ${allyId}`,
      },
      userId,
    );

    const existing = await this.findAllocation(allyId, dto.variantId);
    if (existing) {
      const { error } = await db
        .from('ally_stock_allocations')
        .update({
          quantity_allocated: existing.quantity_allocated + dto.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await db.from('ally_stock_allocations').insert({
        ally_id: allyId,
        variant_id: dto.variantId,
        quantity_allocated: dto.quantity,
        allocated_by: userId,
      });
      if (error) throw error;
    }

    return this.getAllocations(allyId);
  }

  /** Return on-hand stock from an ally back to central inventory. */
  async returnStock(allyId: string, dto: ReturnStockDto, userId: string) {
    const db = this.supabase.getAdminClient();

    const existing = await this.findAllocation(allyId, dto.variantId);
    if (!existing) throw new NotFoundException('No allocation found for this variant');

    const onHand =
      existing.quantity_allocated - existing.quantity_returned - existing.quantity_sold;
    if (onHand <= 0) throw new BadRequestException('Ally has no units on hand to return');
    if (dto.quantity > onHand) {
      throw new BadRequestException(`Only ${onHand} unit(s) on hand to return`);
    }

    // Move stock back into central inventory + log the reverse transfer.
    await this.inventory.adjustStock(
      {
        variant_id: dto.variantId,
        quantity_change: dto.quantity,
        movement_type: 'transfer',
        notes: dto.notes ?? `Returned from ally ${allyId}`,
      },
      userId,
    );

    const { error } = await db
      .from('ally_stock_allocations')
      .update({
        quantity_returned: existing.quantity_returned + dto.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;

    return this.getAllocations(allyId);
  }

  /** Paginated sales history for an ally, with line items. */
  async getSales(allyId: string, query: QueryAllySalesDto) {
    const db = this.supabase.getAdminClient();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, count, error } = await db
      .from('ally_sales')
      .select(
        'id, order_number, customer_name, payment_method, subtotal, total, commission_amount, status, brand, sale_date, ' +
          'items:ally_sale_items(product_name, variant_title, sku, quantity, unit_price, total_price)',
        { count: 'exact' },
      )
      .eq('ally_id', allyId)
      .order('sale_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return { sales: data ?? [], total: count ?? 0, page, limit };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Compose a readable variant title from its option values (e.g. "Green / L"). */
  private variantTitle(variant: any): string | null {
    if (!variant) return null;
    const parts = [variant.option1_value, variant.option2_value, variant.option3_value]
      .filter((v) => v != null && v !== '');
    return parts.length ? parts.join(' / ') : null;
  }

  private async findAllocation(allyId: string, variantId: string) {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('ally_stock_allocations')
      .select('id, quantity_allocated, quantity_returned, quantity_sold')
      .eq('ally_id', allyId)
      .eq('variant_id', variantId)
      .maybeSingle();
    return data;
  }

  private async assertAllyExists(allyId: string) {
    const db = this.supabase.getAdminClient();
    const { data } = await db.from('allies').select('id').eq('id', allyId).maybeSingle();
    if (!data) throw new NotFoundException('Ally not found');
  }
}
