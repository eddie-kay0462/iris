import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';

export class QueryInventoryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['true', 'false'])
  low_stock?: string;

  @IsOptional()
  @IsEnum(['true', 'false'])
  out_of_stock?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
