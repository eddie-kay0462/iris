import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateVariantDto {
  @IsOptional()
  @IsString()
  option1_name?: string;

  @IsOptional()
  @IsString()
  option1_value?: string;

  @IsOptional()
  @IsString()
  option2_name?: string;

  @IsOptional()
  @IsString()
  option2_value?: string;

  @IsOptional()
  @IsString()
  option3_name?: string;

  @IsOptional()
  @IsString()
  option3_value?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compare_at_price?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inventory_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  weight_unit?: string;
}
