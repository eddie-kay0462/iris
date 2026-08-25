import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreatePromoDto, DiscountType } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { PairingTierDto } from './dto/pairing-tier.dto';
import { DiscountEngineService } from './discount-engine.service';
import { ActivityLogService } from '../common/activity/activity-log.service';

export interface ValidatePromoResult {
  discountAmount: number;
  promoCodeId: string;
  discountType: DiscountType;
  message: string;
}

const DEFAULT_CHANNELS = ['online', 'popup', 'walkin'];

@Injectable()
export class PromosService {
  constructor(
    private supabase: SupabaseService,
    private engine: DiscountEngineService,
    private activityLog: ActivityLogService,
  ) {}

  async findAll() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select('*, promo_pairing_tiers (*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.withSortedTiers);
  }

  async findOne(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select('*, promo_pairing_tiers (*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Promo code not found');
    return this.withSortedTiers(data);
  }

  private withSortedTiers = (row: any) => ({
    ...row,
    promo_pairing_tiers: (row.promo_pairing_tiers ?? []).sort(
      (a: any, b: any) => a.min_paired_count - b.min_paired_count,
    ),
  });

  async create(dto: CreatePromoDto, adminId: string) {
    this.assertShape(dto);

    const db = this.supabase.getAdminClient();
    const isPairing = dto.discount_type === 'pairing';

    const { data, error } = await db
      .from('promo_codes')
      .insert({
        code: isPairing ? null : dto.code!.toUpperCase().trim(),
        description: dto.description || null,
        discount_type: dto.discount_type,
        discount_value: dto.discount_value ?? 0,
        applicable_product_ids: dto.applicable_product_ids || null,
        min_order_amount: dto.min_order_amount ?? null,
        max_discount_amount: dto.max_discount_amount ?? null,
        max_uses: dto.max_uses ?? null,
        starts_at: dto.starts_at ?? null,
        expires_at: dto.expires_at ?? null,
        is_active: dto.is_active ?? true,
        channels: dto.channels?.length ? dto.channels : DEFAULT_CHANNELS,
        auto_apply: isPairing ? true : (dto.auto_apply ?? false),
        anchor_product_id: isPairing ? dto.anchor_product_id! : null,
        pairing_basis: isPairing ? (dto.pairing_basis ?? 'units') : null,
        applies_to: isPairing ? (dto.applies_to ?? 'anchor') : null,
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

    if (isPairing) await this.replaceTiers(data.id, dto.tiers ?? []);

    await this.activityLog.log({
      action: 'create',
      entityType: 'promo_code',
      entityId: data.id,
      adminId: adminId,
      changes: {
        code: data.code,
        discount_type: data.discount_type,
        channels: data.channels,
        tiers: isPairing ? (dto.tiers ?? []) : undefined,
      },
    });

    return this.findOne(data.id);
  }

  async update(id: string, dto: UpdatePromoDto, adminId?: string) {
    const existing = await this.findOne(id);
    const discountType = (dto.discount_type ?? existing.discount_type) as DiscountType;
    this.assertShape({
      ...existing,
      ...dto,
      discount_type: discountType,
      tiers: dto.tiers ?? existing.promo_pairing_tiers ?? [],
    } as CreatePromoDto);

    const db = this.supabase.getAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (dto.code !== undefined)
      updates.code = dto.code ? dto.code.toUpperCase().trim() : null;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.discount_type !== undefined) updates.discount_type = dto.discount_type;
    if (dto.discount_value !== undefined) updates.discount_value = dto.discount_value;
    if (dto.applicable_product_ids !== undefined)
      updates.applicable_product_ids = dto.applicable_product_ids;
    if (dto.min_order_amount !== undefined) updates.min_order_amount = dto.min_order_amount;
    if (dto.max_discount_amount !== undefined)
      updates.max_discount_amount = dto.max_discount_amount;
    if (dto.max_uses !== undefined) updates.max_uses = dto.max_uses;
    if (dto.starts_at !== undefined) updates.starts_at = dto.starts_at;
    if (dto.expires_at !== undefined) updates.expires_at = dto.expires_at;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;
    if (dto.channels !== undefined)
      updates.channels = dto.channels?.length ? dto.channels : DEFAULT_CHANNELS;
    if (dto.anchor_product_id !== undefined)
      updates.anchor_product_id = dto.anchor_product_id;
    if (dto.pairing_basis !== undefined) updates.pairing_basis = dto.pairing_basis;
    if (dto.applies_to !== undefined) updates.applies_to = dto.applies_to;

    // A promo switched into or out of 'pairing' has to have its shape columns
    // moved with it, or the promo_codes_shape_check constraint will reject it.
    if (dto.discount_type !== undefined) {
      if (dto.discount_type === 'pairing') {
        updates.auto_apply = true;
        updates.code = null;
        updates.pairing_basis = dto.pairing_basis ?? existing.pairing_basis ?? 'units';
        updates.applies_to = dto.applies_to ?? existing.applies_to ?? 'anchor';
      } else {
        updates.auto_apply = dto.auto_apply ?? false;
        updates.anchor_product_id = null;
        updates.pairing_basis = null;
        updates.applies_to = null;
      }
    } else if (dto.auto_apply !== undefined) {
      updates.auto_apply = dto.auto_apply;
    }

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

    if (dto.tiers !== undefined) await this.replaceTiers(id, dto.tiers);
    if (discountType !== 'pairing') await this.replaceTiers(id, []);

    await this.activityLog.log({
      action: 'update',
      entityType: 'promo_code',
      entityId: id,
      adminId,
      changes: { before: this.auditShape(existing), after: updates },
    });

    return this.findOne(data.id);
  }

  async remove(id: string, adminId?: string) {
    const existing = await this.findOne(id);

    const db = this.supabase.getAdminClient();
    // promo_pairing_tiers cascades; promo_redemptions null out their FK so the
    // historical record of what was discounted survives the delete.
    const { error } = await db.from('promo_codes').delete().eq('id', id);
    if (error) throw error;

    await this.activityLog.log({
      action: 'delete',
      entityType: 'promo_code',
      entityId: id,
      adminId,
      changes: this.auditShape(existing),
    });
  }

  /** The fields worth keeping in the audit trail — not the whole row. */
  private auditShape(promo: any) {
    return {
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      is_active: promo.is_active,
      channels: promo.channels,
      max_uses: promo.max_uses,
      used_count: promo.used_count,
      anchor_product_id: promo.anchor_product_id,
      tiers: promo.promo_pairing_tiers,
    };
  }

  /** Tiers are small and always edited as a set, so replace rather than diff. */
  private async replaceTiers(promoId: string, tiers: PairingTierDto[]) {
    const db = this.supabase.getAdminClient();
    await db.from('promo_pairing_tiers').delete().eq('promo_code_id', promoId);

    if (!tiers.length) return;

    const { error } = await db.from('promo_pairing_tiers').insert(
      tiers.map((t) => ({
        promo_code_id: promoId,
        min_paired_count: t.min_paired_count,
        value_type: t.value_type,
        value: t.value,
        max_discount_amount: t.max_discount_amount ?? null,
      })),
    );
    if (error) throw error;
  }

  private assertShape(dto: CreatePromoDto) {
    if (dto.discount_type === 'pairing') {
      if (!dto.anchor_product_id) {
        throw new BadRequestException('A pairing rule needs an anchor product');
      }
      const tiers = dto.tiers ?? [];
      if (!tiers.length) {
        throw new BadRequestException('A pairing rule needs at least one tier');
      }
      const thresholds = tiers.map((t) => t.min_paired_count);
      if (new Set(thresholds).size !== thresholds.length) {
        throw new BadRequestException('Each tier needs a distinct paired-item count');
      }
      for (const t of tiers) {
        if (t.value_type === 'percentage' && t.value > 100) {
          throw new BadRequestException('A percentage tier cannot exceed 100%');
        }
      }
      return;
    }

    if (!dto.code?.trim()) {
      throw new BadRequestException('A promo code is required');
    }
    if (dto.discount_type !== 'free_shipping' && !dto.discount_value) {
      throw new BadRequestException('Discount value is required');
    }
    if (dto.discount_type === 'percentage' && (dto.discount_value ?? 0) > 100) {
      throw new BadRequestException('A percentage discount cannot exceed 100%');
    }
  }

  /**
   * @deprecated Kept so the original POST /promos/validate contract survives.
   * New callers should use DiscountEngineService.resolve via POST /promos/resolve,
   * which also surfaces auto-applied pairing rules.
   */
  async validate(dto: ValidatePromoDto): Promise<ValidatePromoResult> {
    const resolution = await this.engine.resolve({
      channel: 'online',
      items: (dto.items ?? []).map((i) => ({
        productId: i.productId,
        unitPrice: i.price,
        quantity: i.quantity,
      })),
      shippingCost: dto.shippingCost,
      code: dto.code,
    });

    const code = resolution.breakdown.codeCandidate;
    if (!code?.promoCodeId) {
      throw new BadRequestException(
        'This promo code does not apply to the items in your cart',
      );
    }

    return {
      discountAmount: code.amount,
      promoCodeId: code.promoCodeId,
      discountType: code.discountType as DiscountType,
      message: 'Promo code applied',
    };
  }

  /** @deprecated Superseded by the two-phase reserve/confirm ledger. */
  async applyToOrder(promoCodeId: string): Promise<void> {
    const db = this.supabase.getAdminClient();
    const { error } = await db.rpc('increment_promo_used_count', {
      promo_id: promoCodeId,
    });
    if (error) {
      throw new Error(
        `Failed to increment used_count for promo ${promoCodeId}: ${error.message}`,
      );
    }
  }
}
