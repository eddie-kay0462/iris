import { IsOptional, IsString } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class CreatePopupCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
