import { IsOptional, IsString } from 'class-validator';

export class QueryPreordersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
