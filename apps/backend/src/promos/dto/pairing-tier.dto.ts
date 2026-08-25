import { IsNumber, IsOptional, IsIn, Min } from 'class-validator';

export class PairingTierDto {
  /** Fires when the paired count is at least this. Highest satisfied tier wins. */
  @IsNumber()
  @Min(1)
  min_paired_count: number;

  @IsIn(['percentage', 'fixed'])
  value_type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number | null;
}
