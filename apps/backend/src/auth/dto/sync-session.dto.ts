import { IsString, IsNotEmpty } from 'class-validator';

export class SyncSessionDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;
}
