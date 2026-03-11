import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  review_text?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;
}
