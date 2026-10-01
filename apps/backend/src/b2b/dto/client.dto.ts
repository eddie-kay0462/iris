import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class CreateB2bClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_name?: string;

  @IsOptional()
  @IsPhoneNumber()
  contact_phone?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateB2bClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  // null clears a contact field.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_name?: string | null;

  @IsOptional()
  @IsPhoneNumber()
  contact_phone?: string | null;

  @IsOptional()
  @IsEmail()
  contact_email?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  /** true archives the client (hidden from pickers); false restores it. */
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class QueryB2bClientsDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** 'true' to list archived clients as well. */
  @IsOptional()
  @IsString()
  include_archived?: string;
}
