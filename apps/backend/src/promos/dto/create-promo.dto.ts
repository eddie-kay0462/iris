import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  IsIn,
  IsDateString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PairingTierDto } from './pairing-tier.dto';

export type DiscountType =
  | 'fixed'
  | 'percentage'
  | 'free_shipping'
  | 'product'
  | 'pairing';

export class CreatePromoDto {
  /** Optional for pairing rules, which auto-apply and carry no code. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['fixed', 'percentage', 'free_shipping', 'product', 'pairing'])
  discount_type: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  applicable_product_ids?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** Sales channels this promo may be applied on. Defaults to all three. */
  @IsOptional()
  @IsArray()
  @IsIn(['online', 'popup', 'walkin'], { each: true })
  channels?: ('online' | 'popup' | 'walkin')[];

  // ─── Pairing rules ─────────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  auto_apply?: boolean;

  /** The product that must be in the cart for a pairing rule to fire. */
  @IsOptional()
  @IsUUID()
  anchor_product_id?: string;

  /** units = sum of non-anchor quantities; products = distinct non-anchor products. */
  @IsOptional()
  @IsIn(['units', 'products'])
  pairing_basis?: 'units' | 'products';

  /** anchor = discount the anchor line; cart = discount the whole subtotal. */
  @IsOptional()
  @IsIn(['anchor', 'cart'])
  applies_to?: 'anchor' | 'cart';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PairingTierDto)
  tiers?: PairingTierDto[];
}
