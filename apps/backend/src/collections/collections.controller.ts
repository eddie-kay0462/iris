import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddCollectionProductsDto } from './dto/manage-collection-products.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('collections')
@UseGuards(PermissionsGuard)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  @Get('admin/list')
  @RequirePermission('products:read')
  findAdmin() {
    return this.collectionsService.findAdmin();
  }

  @Public()
  @Get()
  findPublic() {
    return this.collectionsService.findPublic();
  }

  @Public()
  @Get(':idOrHandle')
  findOnePublic(@Param('idOrHandle') idOrHandle: string) {
    return this.collectionsService.findOnePublic(idOrHandle);
  }

  @Post()
  @RequirePermission('products:create')
  create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Put(':id')
  @RequirePermission('products:update')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  remove(@Param('id') id: string) {
    return this.collectionsService.softDelete(id);
  }

  @Post(':id/products')
  @RequirePermission('products:update')
  addProducts(
    @Param('id') id: string,
    @Body() dto: AddCollectionProductsDto,
  ) {
    return this.collectionsService.addProducts(id, dto.product_ids);
  }

  @Delete(':id/products/:productId')
  @RequirePermission('products:update')
  removeProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.collectionsService.removeProduct(id, productId);
  }
}
