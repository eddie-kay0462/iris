import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundWalkinOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
