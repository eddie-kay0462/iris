import { IsEnum } from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';

export class ChargePopupOrderDto {
  @IsPhoneNumber()
  phone: string;

  @IsEnum(['mtn', 'vod', 'tgo'])
  provider: 'mtn' | 'vod' | 'tgo';
}
