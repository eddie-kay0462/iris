import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone_number?: string;

  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  sms_notifications?: boolean;

  @IsOptional()
  @IsObject()
  default_address?: Record<string, any>;
}
