import { IsString, IsIn, IsOptional, IsBoolean, IsInt, Min, Max, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientPreviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  message: string;

  @IsIn(['all', 'sms_opted_in'])
  recipient_filter: 'all' | 'sms_opted_in';

  /** When true, drop numbers that do not parse as valid Ghanaian (+233) numbers. */
  @IsOptional()
  @IsBoolean()
  ghana_only?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
