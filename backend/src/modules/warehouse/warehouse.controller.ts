import {
  Controller, Get, Post,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  WarehouseService,
  CreateWarehouseDto,
  CreateMovementDto,
  QueryMovementDto,
  AdjustStockDto,
  CreateIncomingDto,
  CreateOutgoingDto,
} from './warehouse.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Warehouse')
@ApiBearerAuth('access-token')
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ============================================
  // OMBORLAR
  // ============================================
  @Get('list')
  @ApiOperation({ summary: "Omborlar ro'yxati" })
  getWarehouses(@CurrentUser() user: any) {
    return this.warehouseService.getWarehouses(user.companyId);
  }

  @Post('list')
  @ApiOperation({ summary: 'Yangi ombor yaratish' })
  createWarehouse(
    @CurrentUser() user: any,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehouseService.createWarehouse(user.companyId, dto);
  }

  // ============================================
  // KO'RINISH (QOLDIQLAR)
  // ============================================
  @Get('overview')
  @ApiOperation({ summary: 'Ombor qoldiqlarini ko\'rish' })
  getOverview(
    @CurrentUser() user: any,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.getOverview(user.companyId, warehouseId);
  }

  // ============================================
  // HARAKATLAR
  // ============================================
  @Get('movements')
  @ApiOperation({ summary: 'Harakatlar tarixi' })
  getMovements(
    @CurrentUser() user: any,
    @Query() query: QueryMovementDto,
  ) {
    return this.warehouseService.getMovements(user.companyId, query);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Harakat qo\'shish (kirim/chiqim/ko\'chirish)' })
  createMovement(
    @CurrentUser() user: any,
    @Body() dto: CreateMovementDto,
  ) {
    return this.warehouseService.createMovement(user.companyId, dto, user.id);
  }

  // ============================================
  // KIRIM HUJJATI
  // ============================================
  @Post('incoming')
  @ApiOperation({ summary: 'Kirim hujjati (multi-qator)' })
  createIncoming(
    @CurrentUser() user: any,
    @Body() dto: CreateIncomingDto,
  ) {
    return this.warehouseService.createIncoming(user.companyId, dto, user.id);
  }

  // ============================================
  // CHIQIM HUJJATI
  // ============================================
  @Post('outgoing')
  @ApiOperation({ summary: 'Chiqim hujjati (multi-qator)' })
  createOutgoing(
    @CurrentUser() user: any,
    @Body() dto: CreateOutgoingDto,
  ) {
    return this.warehouseService.createOutgoing(user.companyId, dto, user.id);
  }

  // ============================================
  // INVENTARIZATSIYA
  // ============================================
  @Post('adjust')
  @ApiOperation({ summary: 'Qoldiqni sozlash (inventarizatsiya)' })
  adjustStock(
    @CurrentUser() user: any,
    @Body() dto: AdjustStockDto,
  ) {
    return this.warehouseService.adjustStock(user.companyId, dto, user.id);
  }
}
