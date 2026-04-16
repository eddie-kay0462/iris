import { IsNumber, Min } from 'class-validator';

export class RestockPreorderDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}
