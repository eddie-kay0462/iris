import { IsNumber, Min } from 'class-validator';

export class SetRevenueTargetDto {
  @IsNumber()
  @Min(0)
  target: number;
}
