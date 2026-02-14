import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('products')
@UseGuards(PermissionsGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // --- Admin (must be before :idOrHandle to avoid route collision) ---

  @Get('admin/list')
  @RequirePermission('products:read')
  findAdmin(@Query() query: QueryProductsDto) {
    return this.productsService.findAdmin(query);
  }

  // --- Public storefront ---

  @Public()
  @Get()
  findPublic(@Query() query: QueryProductsDto) {
    return this.productsService.findPublic(query);
  }

  @Public()
  @Get(':idOrHandle')
  findOnePublic(@Param('idOrHandle') idOrHandle: string) {
    return this.productsService.findOnePublic(idOrHandle);
  }

  @Post()
  @RequirePermission('products:create')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(dto, user.sub);
  }

  @Put(':id')
  @RequirePermission('products:update')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }

  @Patch(':id/publish')
  @RequirePermission('products:publish')
  togglePublish(@Param('id') id: string) {
    return this.productsService.togglePublish(id);
  }

  // --- Variants ---

  @Post(':id/variants')
  @RequirePermission('products:create')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @Put(':id/variants/:variantId')
  @RequirePermission('products:update')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @RequirePermission('products:update')
  deleteVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteVariant(id, variantId);
  }

  // --- Images ---

  @Post(':id/images')
  @RequirePermission('products:update')
  addImage(
    @Param('id') id: string,
    @Body() body: { url: string; alt_text?: string },
  ) {
    return this.productsService.addImage(id, body);
  }

  @Delete(':id/images/:imageId')
  @RequirePermission('products:update')
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteImage(id, imageId);
  }

  @Put(':id/images/reorder')
  @RequirePermission('products:update')
  reorderImages(
    @Param('id') id: string,
    @Body() body: { image_ids: string[] },
  ) {
    return this.productsService.reorderImages(id, body);
  }
}
