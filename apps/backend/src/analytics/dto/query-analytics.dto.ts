import { IsOptional, IsIn, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class OverviewQueryDto extends DateRangeDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '12m', 'custom'])
  period?: string = '30d';
}

export class RevenueChartDto extends DateRangeDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: string = 'day';

  @IsOptional()
  @IsIn(['7d', '30d', '90d', '12m', 'custom'])
  period?: string = '30d';
}

export class ReportQueryDto extends DateRangeDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '12m', 'custom'])
  period?: string = '30d';

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: string = 'day';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
