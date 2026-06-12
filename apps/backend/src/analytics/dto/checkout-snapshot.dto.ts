import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsString()
  @MaxLength(256)
  productName: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  variantTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  unitPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  imageUrl?: string;
}

export class CheckoutSnapshotDto {
  @IsString()
  @MaxLength(64)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(256)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  customerName?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  subtotal?: number;

  @IsOptional()
  @IsUUID()
  completedOrderId?: string;
}
