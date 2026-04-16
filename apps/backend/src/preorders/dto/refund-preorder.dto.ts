import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class RefundPreorderDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
