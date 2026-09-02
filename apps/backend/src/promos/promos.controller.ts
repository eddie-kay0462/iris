import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { DiscountEngineService } from './discount-engine.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { ResolveDiscountDto } from './dto/resolve-discount.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('promos')
@UseGuards(PermissionsGuard)
export class PromosController {
  constructor(
    private promosService: PromosService,
    private engine: DiscountEngineService,
  ) {}

  @Get()
  @RequirePermission('settings:read')
  findAll() {
    return this.promosService.findAll();
  }

  /**
   * Active bundle rules, for the storefront badge. Public and cart-independent
   * — it only says which products carry a deal, never what anything costs.
   */
  @Get('bundles')
  @Public()
  listBundles(@Query('channel') channel?: string) {
    return this.engine.listActiveBundles(
      channel === 'popup' || channel === 'walkin' ? channel : 'online',
    );
  }

  /**
   * Live volume rules, for the cart's "add one more item" nudge. Public and
   * cart-independent — it only says which thresholds are on offer.
   */
  @Get('volume-offers')
  @Public()
  listVolumeOffers(@Query('channel') channel?: string) {
    return this.engine.listActiveVolumeOffers(
      channel === 'popup' || channel === 'walkin' ? channel : 'online',
    );
  }

  // Declared before ':id' so the literal segment is not swallowed by the param.
  @Get('redemptions')
  @RequirePermission('settings:read')
  listRedemptions(
    @Query('channel') channel?: string,
    @Query('promoCodeId') promoCodeId?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.engine.listRedemptions({
      channel,
      promoCodeId,
      source,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('settings:read')
  findOne(@Param('id') id: string) {
    return this.promosService.findOne(id);
  }

  @Post()
  @RequirePermission('settings:update')
  create(@Body() dto: CreatePromoDto, @CurrentUser() user: any) {
    return this.promosService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermission('settings:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
    @CurrentUser() user: any,
  ) {
    return this.promosService.update(id, dto, user?.sub);
  }

  @Delete(':id')
  @RequirePermission('settings:update')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.promosService.remove(id, user?.sub);
  }

  /**
   * The cross-channel entry point. Returns the full resolution — the winning
   * discount plus every candidate considered — so the storefront and both POS
   * surfaces can render auto-applied bundle deals without anyone typing a code.
   */
  @Post('resolve')
  @Public()
  resolve(@Body() dto: ResolveDiscountDto) {
    return this.engine.resolve({
      channel: dto.channel,
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      shippingCost: dto.shippingCost,
      code: dto.code,
      manualOverride: dto.manualOverride,
    });
  }

  /** @deprecated Superseded by POST /promos/resolve. */
  @Post('validate')
  @Public()
  validate(@Body() dto: ValidatePromoDto) {
    return this.promosService.validate(dto);
  }
}
