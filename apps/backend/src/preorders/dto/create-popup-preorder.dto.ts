import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class PreorderItemDto {
  @IsString()
  variantId: string;

  @IsString()
  productTitle: string;

  @IsOptional()
  @IsString()
  variantTitle?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePopupPreorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreorderItemDto)
  items: PreorderItemDto[];

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsString()
  customer_phone: string;

  @IsOptional()
  @IsIn(['cash', 'momo', 'bank_transfer', 'pending'])
  payment_method?: string;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
