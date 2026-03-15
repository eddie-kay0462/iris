import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePopupOrderDto {
  @IsOptional()
  @IsEnum(['active', 'awaiting_payment', 'confirmed', 'completed', 'on_hold', 'cancelled'])
  status?: 'active' | 'awaiting_payment' | 'confirmed' | 'completed' | 'on_hold' | 'cancelled';

  @IsOptional()
  @IsEnum(['cash', 'momo', 'bank_transfer'])
  payment_method?: 'cash' | 'momo' | 'bank_transfer';

  @IsOptional()
  @IsString()
  payment_reference?: string;

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
}
