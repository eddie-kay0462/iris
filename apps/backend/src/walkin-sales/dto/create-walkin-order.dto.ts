import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPhoneNumber } from '../../common/utils/phone';

export class CreateWalkinOrderItemDto {
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  variant_title?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;
}

export class CreateWalkinOrderDto {
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsPhoneNumber()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsUUID()
  customer_profile_id?: string;

  @IsOptional()
  @IsEnum(['cash', 'momo', 'bank_transfer'])
  payment_method?: 'cash' | 'momo' | 'bank_transfer';

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsEnum(['none', 'percentage', 'fixed'])
  discount_type?: 'none' | 'percentage' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @IsOptional()
  @IsString()
  discount_reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWalkinOrderItemDto)
  items: CreateWalkinOrderItemDto[];
}
