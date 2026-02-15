import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryMovementsDto {
  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsOptional()
  @IsString()
  movement_type?: string;

  @IsOptional()
  @IsString()
  from_date?: string;

  @IsOptional()
  @IsString()
  to_date?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
