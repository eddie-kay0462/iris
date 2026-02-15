import { IsArray, IsString, IsOptional, IsNumber } from 'class-validator';

export class AddCollectionProductsDto {
  @IsArray()
  @IsString({ each: true })
  product_ids: string[];
}

export class CollectionProductPositionDto {
  @IsString()
  product_id: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}
