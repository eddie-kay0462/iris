import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  variant_id: string;

  @IsNumber()
  quantity_change: number;

  @IsEnum([
    'adjustment',
    'sale',
    'return',
    'restock',
    'damage',
    'correction',
  ])
  movement_type: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
