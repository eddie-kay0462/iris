import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  @IsEnum(['draft', 'active', 'closed'])
  status?: 'draft' | 'active' | 'closed';

  // Estimated foot traffic — powers conversion rate and revenue-per-visitor
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  visitor_count?: number;
}
