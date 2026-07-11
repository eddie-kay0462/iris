import { IsOptional, IsString } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

// Mirrors the allies app customer-capture shape: name split into first/last,
// optional email (triggers a storefront invite) and optional phone.
export class CreateWalkinCustomerDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone_number?: string;
}
