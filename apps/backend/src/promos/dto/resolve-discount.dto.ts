import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsUUID,
  IsEnum,
  IsIn,
  Min,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ManualOverrideDto {
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResolveDiscountDto {
  @IsIn(['online', 'popup', 'walkin'])
  channel: 'online' | 'popup' | 'walkin';

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ResolveItemDto)
  items: ResolveItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualOverrideDto)
  manualOverride?: ManualOverrideDto;
}
