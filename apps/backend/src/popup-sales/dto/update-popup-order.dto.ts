import { IsEnum, IsOptional, IsString } from 'class-validator';

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
  notes?: string;
}
