import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('promos')
@UseGuards(PermissionsGuard)
export class PromosController {
  constructor(private promosService: PromosService) {}

  @Get()
  @RequirePermission('settings:read')
  findAll() {
    return this.promosService.findAll();
  }

  @Post()
  @RequirePermission('settings:update')
  create(@Body() dto: CreatePromoDto, @CurrentUser() user: any) {
    return this.promosService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermission('settings:update')
  update(@Param('id') id: string, @Body() dto: UpdatePromoDto) {
    return this.promosService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('settings:update')
  remove(@Param('id') id: string) {
    return this.promosService.remove(id);
  }

  @Post('validate')
  @Public()
  validate(@Body() dto: ValidatePromoDto) {
    return this.promosService.validate(dto);
  }
}
