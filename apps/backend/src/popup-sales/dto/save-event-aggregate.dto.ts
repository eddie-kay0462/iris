import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * The two numbers off a busy pop-up's paper tally, plus a note about where they
 * came from. Both zero means "remove the totals" rather than "record nothing".
 */
export class SaveEventAggregateDto {
  // Total takings for the event. Revenue with no units is legitimate, so 0 units
  // is not a reason to reject this.
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  revenue: number;

  // Total units that left the stand. Counts toward the Road to HQ goal.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  units: number;

  // e.g. "From the stall's paper tally" — stored on popup_orders.notes.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
