import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreatePromoDto, DiscountType } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';

export interface ValidatePromoResult {
  discountAmount: number;
  promoCodeId: string;
  discountType: DiscountType;
  message: string;
}

@Injectable()
export class PromosService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Promo code not found');
    return data;
  }

  async create(dto: CreatePromoDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .insert({
        code: dto.code.toUpperCase().trim(),
        description: dto.description || null,
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        applicable_product_ids: dto.applicable_product_ids || null,
        min_order_amount: dto.min_order_amount ?? null,
        max_discount_amount: dto.max_discount_amount ?? null,
        max_uses: dto.max_uses ?? null,
        starts_at: dto.starts_at ?? null,
        expires_at: dto.expires_at ?? null,
        is_active: dto.is_active ?? true,
        created_by: adminId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('A promo code with this code already exists');
      }
      throw error;
    }

    return data;
  }

  async update(id: string, dto: UpdatePromoDto) {
    await this.findOne(id);

    const db = this.supabase.getAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (dto.code !== undefined) updates.code = dto.code.toUpperCase().trim();
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.discount_type !== undefined) updates.discount_type = dto.discount_type;
    if (dto.discount_value !== undefined) updates.discount_value = dto.discount_value;
    if (dto.applicable_product_ids !== undefined) updates.applicable_product_ids = dto.applicable_product_ids;
    if (dto.min_order_amount !== undefined) updates.min_order_amount = dto.min_order_amount;
    if (dto.max_discount_amount !== undefined) updates.max_discount_amount = dto.max_discount_amount;
    if (dto.max_uses !== undefined) updates.max_uses = dto.max_uses;
    if (dto.starts_at !== undefined) updates.starts_at = dto.starts_at;
    if (dto.expires_at !== undefined) updates.expires_at = dto.expires_at;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;

    const { data, error } = await db
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('A promo code with this code already exists');
      }
      throw error;
    }

    return data;
  }

  async remove(id: string) {
    await this.findOne(id);

    const db = this.supabase.getAdminClient();
    const { error } = await db.from('promo_codes').delete().eq('id', id);
    if (error) throw error;
  }

  async validate(dto: ValidatePromoDto): Promise<ValidatePromoResult> {
    const db = this.supabase.getAdminClient();

    // Case-insensitive lookup via the UPPER index
    const { data: promo, error } = await db
      .from('promo_codes')
      .select('*')
      .ilike('code', dto.code.trim())
      .single();

    if (error || !promo) {
      throw new NotFoundException('Invalid promo code');
    }

    if (!promo.is_active) {
      throw new BadRequestException('This promo code is no longer active');
    }

    const now = new Date();

    if (promo.starts_at && new Date(promo.starts_at) > now) {
      throw new BadRequestException('This promo code is not yet valid');
    }

    if (promo.expires_at && new Date(promo.expires_at) < now) {
      throw new BadRequestException('This promo code has expired');
    }

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      throw new BadRequestException('This promo code has reached its usage limit');
    }

    if (promo.min_order_amount !== null && dto.subtotal < promo.min_order_amount) {
      throw new BadRequestException(
        `Minimum order amount for this code is GH₵ ${promo.min_order_amount.toLocaleString()}`,
      );
    }

    const discountAmount = this.computeDiscount(promo, dto);

    return {
      discountAmount: Math.max(0, discountAmount),
      promoCodeId: promo.id,
      discountType: promo.discount_type as DiscountType,
      message: 'Promo code applied',
    };
  }

  async applyToOrder(promoCodeId: string): Promise<void> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('promo_codes')
      .select('used_count')
      .eq('id', promoCodeId)
      .single();

    if (data) {
      await db
        .from('promo_codes')
        .update({
          used_count: data.used_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promoCodeId);
    }
  }

  private computeDiscount(
    promo: {
      discount_type: string;
      discount_value: number;
      max_discount_amount: number | null;
      applicable_product_ids: string[] | null;
    },
    dto: ValidatePromoDto,
  ): number {
    switch (promo.discount_type) {
      case 'fixed':
        return Math.min(promo.discount_value, dto.subtotal);

      case 'percentage': {
        const raw = dto.subtotal * (promo.discount_value / 100);
        return promo.max_discount_amount !== null
          ? Math.min(raw, promo.max_discount_amount)
          : raw;
      }

      case 'free_shipping':
        return dto.shippingCost;

      case 'product': {
        if (!promo.applicable_product_ids?.length || !dto.items?.length) return 0;
        const eligibleSubtotal = dto.items
          .filter((item) => promo.applicable_product_ids!.includes(item.productId))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        return Math.min(promo.discount_value, eligibleSubtotal);
      }

      default:
        return 0;
    }
  }
}
