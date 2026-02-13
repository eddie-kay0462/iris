import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 8)
  token: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;
}
