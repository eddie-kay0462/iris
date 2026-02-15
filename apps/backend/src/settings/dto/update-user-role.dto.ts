import { IsIn, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['public', 'staff', 'manager', 'admin'])
  role: string;
}
