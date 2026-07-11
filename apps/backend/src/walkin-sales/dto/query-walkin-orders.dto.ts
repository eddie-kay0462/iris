import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryWalkinOrdersDto {
  @IsOptional()
  @IsEnum(['completed', 'awaiting_payment', 'on_hold', 'cancelled', 'refunded'])
  status?: 'completed' | 'awaiting_payment' | 'on_hold' | 'cancelled' | 'refunded';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
