import { IsEnum, IsString } from 'class-validator';

export class ChargePopupOrderDto {
  @IsString()
  phone: string;

  @IsEnum(['mtn', 'vod', 'tgo'])
  provider: 'mtn' | 'vod' | 'tgo';
}
