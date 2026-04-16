import { IsString, IsIn, IsOptional, IsInt, Min, Max, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientPreviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  message: string;

  @IsIn(['all', 'sms_opted_in'])
  recipient_filter: 'all' | 'sms_opted_in';

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
