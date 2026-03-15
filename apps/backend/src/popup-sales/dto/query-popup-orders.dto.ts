import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryPopupOrdersDto {
  @IsOptional()
  @IsEnum(['active', 'awaiting_payment', 'confirmed', 'completed', 'on_hold', 'cancelled'])
  status?: 'active' | 'awaiting_payment' | 'confirmed' | 'completed' | 'on_hold' | 'cancelled';

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
