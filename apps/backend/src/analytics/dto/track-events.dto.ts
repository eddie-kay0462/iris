import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const TRACKED_EVENT_TYPES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const;

export class TrackEventDto {
  @IsString()
  @MaxLength(64)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsIn(TRACKED_EVENT_TYPES as unknown as string[])
  eventType: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  landingPage?: string;

  @IsOptional()
  @IsIn(['mobile', 'tablet', 'desktop'])
  deviceType?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  value?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TrackEventsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}
