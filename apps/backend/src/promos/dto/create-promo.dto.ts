import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  Min,
  MinLength,
} from 'class-validator';

export type DiscountType = 'fixed' | 'percentage' | 'free_shipping' | 'product';

export class CreatePromoDto {
  @IsString()
  @MinLength(3)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['fixed', 'percentage', 'free_shipping', 'product'])
  discount_type: DiscountType;

  @IsNumber()
  @Min(0)
  discount_value: number;

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
}
