import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone_number?: string;
}
