import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PreorderItemDto } from './create-preorder.dto';

export class CheckPreorderEligibilityDto {
  @ValidateNested()
  @Type(() => PreorderItemDto)
  item: PreorderItemDto;
}
