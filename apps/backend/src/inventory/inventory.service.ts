import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';

@Injectable()
export class InventoryService {
  constructor(private supabase: SupabaseService) {}

  async findAll(query: QueryInventoryDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('product_variants')
      .select(
        '*, product:products!inner(id, title, status, deleted_at)',
        { count: 'exact' },
      )
      .is('product.deleted_at', null);

    if (query.search) {
      q = q.or(
        `sku.ilike.%${query.search}%,product.title.ilike.%${query.search}%`,
      );
    }
    if (query.low_stock === 'true') {
      q = q.lt('inventory_quantity', 10).gt('inventory_quantity', 0);
    }
    if (query.out_of_stock === 'true') {
      q = q.eq('inventory_quantity', 0);
    }

    q = q.order('inventory_quantity', { ascending: true }).range(from, to);

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

  async getStats() {
    const db = this.supabase.getAdminClient();

    const { data: variants, error } = await db
      .from('product_variants')
      .select('inventory_quantity, price, product:products!inner(deleted_at)')
      .is('product.deleted_at', null);

    if (error) throw error;

    const items = variants || [];
    const totalSkus = items.length;
    const lowStock = items.filter(
      (v) => v.inventory_quantity > 0 && v.inventory_quantity < 10,
    ).length;
    const outOfStock = items.filter(
      (v) => v.inventory_quantity === 0,
    ).length;
    const totalValue = items.reduce(
      (sum, v) => sum + (v.price || 0) * (v.inventory_quantity || 0),
      0,
    );

    return { totalSkus, lowStock, outOfStock, totalValue };
  }

  async getLowStock() {
    const db = this.supabase.getAdminClient();

    const { data, error } = await db
      .from('product_variants')
      .select('*, product:products!inner(id, title, deleted_at)')
      .is('product.deleted_at', null)
      .lt('inventory_quantity', 10)
      .order('inventory_quantity', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async adjustStock(dto: AdjustStockDto, userId: string) {
    const db = this.supabase.getAdminClient();

    // Get current variant
    const { data: variant, error: fetchErr } = await db
      .from('product_variants')
      .select('id, inventory_quantity')
      .eq('id', dto.variant_id)
      .single();

    if (fetchErr || !variant)
      throw new NotFoundException('Variant not found');

    const previousQuantity = variant.inventory_quantity || 0;
    const newQuantity = previousQuantity + dto.quantity_change;

    // Update quantity
    const { error: updateErr } = await db
      .from('product_variants')
      .update({ inventory_quantity: Math.max(0, newQuantity) })
      .eq('id', dto.variant_id);

    if (updateErr) throw updateErr;

    // Log movement manually (in case DB trigger doesn't capture created_by)
    const { error: movErr } = await db
      .from('inventory_movements')
      .insert({
        variant_id: dto.variant_id,
        quantity_change: dto.quantity_change,
        previous_quantity: previousQuantity,
        new_quantity: Math.max(0, newQuantity),
        movement_type: dto.movement_type,
        notes: dto.notes,
        created_by: userId,
      });

    if (movErr) throw movErr;

    return {
      variant_id: dto.variant_id,
      previous_quantity: previousQuantity,
      new_quantity: Math.max(0, newQuantity),
      change: dto.quantity_change,
    };
  }

  async bulkAdjust(adjustments: AdjustStockDto[], userId: string) {
    const results = [];
    for (const dto of adjustments) {
      results.push(await this.adjustStock(dto, userId));
    }
    return results;
  }

  async getMovements(query: QueryMovementsDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('inventory_movements')
      .select('*, variant:product_variants(id, sku, product:products(title))', {
        count: 'exact',
      });

    if (query.variant_id) {
      q = q.eq('variant_id', query.variant_id);
    }
    if (query.movement_type) {
      q = q.eq('movement_type', query.movement_type);
    }
    if (query.from_date) {
      q = q.gte('created_at', query.from_date);
    }
    if (query.to_date) {
      q = q.lte('created_at', query.to_date);
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
}
