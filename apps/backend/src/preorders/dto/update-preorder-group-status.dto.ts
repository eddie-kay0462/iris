import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePreorderGroupStatusDto {
  @IsIn(['fulfilled', 'cancelled', 'refunded'])
  status: 'fulfilled' | 'cancelled' | 'refunded';

  @IsOptional()
  @IsString()
  notes?: string;
}
