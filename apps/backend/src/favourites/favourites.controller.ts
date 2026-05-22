import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { FavouritesService } from './favourites.service';
import { AddFavouriteDto } from './dto/add-favourite.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller()
@UseGuards(PermissionsGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get('favourites/my')
  getMy(@CurrentUser() user: any) {
    return this.favouritesService.getMyFavourites(user.sub);
  }

  @Post('favourites')
  add(@Body() dto: AddFavouriteDto, @CurrentUser() user: any) {
    return this.favouritesService.add(dto.productId, user.sub);
  }

  @Delete('favourites/:productId')
  remove(@Param('productId') productId: string, @CurrentUser() user: any) {
    return this.favouritesService.remove(productId, user.sub);
  }
}
