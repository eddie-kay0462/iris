import { PartialType } from '@nestjs/mapped-types';
import { CreatePromoDto } from './create-promo.dto';

export class UpdatePromoDto extends PartialType(CreatePromoDto) {}
