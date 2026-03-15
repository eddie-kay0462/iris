import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsEnum(['draft', 'active'])
  status?: 'draft' | 'active';
}
