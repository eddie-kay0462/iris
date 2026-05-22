import { IsUUID } from 'class-validator';

export class AddFavouriteDto {
  @IsUUID()
  productId: string;
}
