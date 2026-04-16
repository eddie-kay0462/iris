import { IsString, IsIn, MaxLength, MinLength } from 'class-validator';

export class BulkSmsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  message: string;

  @IsIn(['all', 'sms_opted_in'])
  recipient_filter: 'all' | 'sms_opted_in';
}
