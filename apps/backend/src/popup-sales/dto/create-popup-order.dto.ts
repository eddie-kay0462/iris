import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
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

export class CreateSplitPaymentDto {
  @IsEnum(['cash', 'momo', 'bank_transfer'])
  method: 'cash' | 'momo' | 'bank_transfer';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsBoolean()
  sent_to_paystack?: boolean;
}

export class CreatePopupOrderDto {
  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

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
  @IsNumber()
  @Min(0)
  hold_duration_minutes?: number;

  @IsOptional()
  @IsString()
  hold_note?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitPaymentDto)
  split_payments?: CreateSplitPaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
