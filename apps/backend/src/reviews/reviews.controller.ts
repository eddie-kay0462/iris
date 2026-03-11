import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller()
@UseGuards(PermissionsGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  /** Admin: list all reviews */
  @Get('reviews')
  @RequirePermission('reviews:read')
  findAll(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  /** Public: approved reviews for a product */
  @Public()
  @Get('products/:productId/reviews')
  findApproved(
    @Param('productId') productId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findApproved(productId, query);
  }

  /** Authenticated: submit a review */
  @Post('products/:productId/reviews')
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.create(productId, dto, user);
  }

  /** Admin: approve a review */
  @Patch('reviews/:id/approve')
  @RequirePermission('reviews:moderate')
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.approve(id, user.sub);
  }

  /** Admin: delete a review */
  @Delete('reviews/:id')
  @RequirePermission('reviews:moderate')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
