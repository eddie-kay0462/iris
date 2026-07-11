import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class UpdateWalkinOrderDto {
  @IsOptional()
  @IsEnum(['completed', 'awaiting_payment', 'on_hold', 'cancelled', 'refunded'])
  status?: 'completed' | 'awaiting_payment' | 'on_hold' | 'cancelled' | 'refunded';

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
  @IsPhoneNumber()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
