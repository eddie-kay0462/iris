import {
  IsString,
  IsIn,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BulkSmsDto {
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
}
