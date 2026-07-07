import { IsOptional, IsString } from 'class-validator';

export class QueryOrdersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from_date?: string;

  @IsOptional()
  @IsString()
  to_date?: string;

  // "true" → only orders (or synthetic popup groups) that contain pre-order lines
  @IsOptional()
  @IsString()
  has_preorders?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
