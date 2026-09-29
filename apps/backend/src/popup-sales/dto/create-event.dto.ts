import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  event_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(['draft', 'active'])
  status?: 'draft' | 'active';

  // Records only total revenue and units instead of individual orders.
  @IsOptional()
  @IsBoolean()
  is_unstructured?: boolean;
}
