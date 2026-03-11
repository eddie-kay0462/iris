import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryReviewsDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  is_approved?: string;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsIn(['created_at', 'rating'])
  sort_by?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: string;
}
