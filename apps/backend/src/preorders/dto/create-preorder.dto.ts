import { IsString, IsNumber, IsOptional, ValidateNested, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class PreorderItemDto {
  @IsString()
  variantId: string;

  @IsOptional()
  @IsString()
  productTitle?: string;

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

export class CreatePreorderDto {
  @ValidateNested()
  @Type(() => PreorderItemDto)
  item: PreorderItemDto;

  @IsString()
  paymentReference: string;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  notify?: { email?: boolean; sms?: boolean };
}
