import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { B2B_STATUSES, B2bStatus } from '../b2b-rules';
import { B2bCostKind } from '../b2b-math';

export class B2bCostLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsIn(['per_unit', 'per_order'])
  kind: B2bCostKind;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}

export class CreateB2bOrderDto {
  @IsUUID()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @Min(1)
  units: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => B2bCostLineDto)
  cost_lines: B2bCostLineDto[];

  @IsOptional()
  @IsDateString()
  expected_start_date?: string;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  /** A new order starts as a draft unless the client has already confirmed it. */
  @IsOptional()
  @IsIn(['draft', 'confirmed'])
  status?: 'draft' | 'confirmed';
}

export class UpdateB2bOrderDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  units?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price?: number;

  /** When sent, replaces every cost line on the order. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => B2bCostLineDto)
  cost_lines?: B2bCostLineDto[];

  /** null clears the date. */
  @IsOptional()
  @IsDateString()
  expected_start_date?: string | null;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string | null;
}

export class UpdateB2bOrderStatusDto {
  @IsIn(B2B_STATUSES as unknown as string[])
  status: B2bStatus;

  /** Only for status = completed. Defaults to now; may be backdated. */
  @IsOptional()
  @IsDateString()
  completed_at?: string;
}

export class QueryB2bOrdersDto {
  /** A single status, or 'open' for everything not yet completed or cancelled. */
  @IsOptional()
  @IsIn([...B2B_STATUSES, 'open'])
  status?: B2bStatus | 'open';

  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class B2bSummaryQueryDto {
  /** ISO start of the reporting window. Omit for all time. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
