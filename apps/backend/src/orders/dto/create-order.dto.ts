import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  IsUUID,
  IsObject,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { IsPhoneNumber } from '../../common/utils/phone';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  variantId: string;

  @IsUUID()
  productId: string;

  @IsString()
  productTitle: string;

  @IsOptional()
  @IsString()
  variantTitle?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ShippingAddressDto {
  @IsString()
  fullName: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsString()
  city: string;

  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsPhoneNumber()
  phone: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsString()
  paymentReference: string;

  @IsNumber()
  @Min(0)
  shippingCost: number;

  // `popup_pickup` is free collection at the next pop-up. It's only valid for
  // carts containing pre-order items — enforced in OrdersService.create(). The
  // pickup date is never accepted from the client; the server resolves it.
  @IsEnum(['standard', 'express', 'popup_pickup'])
  shippingMethod: 'standard' | 'express' | 'popup_pickup';

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}
