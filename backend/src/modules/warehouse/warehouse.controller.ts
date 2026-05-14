import {
  Controller, Get, Post, Delete,
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
  CreateReturnDto,
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
  // QAYTARISH HUJJATI
  // ============================================
  @Post('return')
  @ApiOperation({ summary: 'Tovar qaytarish (xaridordan yoki yetkazib beruvchiga)' })
  createReturn(
    @CurrentUser() user: any,
    @Body() dto: CreateReturnDto,
  ) {
    return this.warehouseService.createReturn(user.companyId, dto, user.id);
  }

  // ============================================
  // QAYTA TO'LDIRISH TAVSIYALARI
  // ============================================
  @Get('restock-suggestions')
  @ApiOperation({ summary: 'Qoldiq kam mahsulotlar + tavsiya etilgan yetkazuvchi/miqdor' })
  getRestockSuggestions(@CurrentUser() user: any) {
    return this.warehouseService.getRestockSuggestions(user.companyId);
  }

  // ============================================
  // OXIRGI HUJJAT — "Kechagi kirimni takrorlash" uchun
  // ============================================
  @Get('last-document')
  @ApiOperation({ summary: 'Oxirgi kirim/chiqim hujjati (qatorlar bilan)' })
  getLastDocument(
    @CurrentUser() user: any,
    @Query('type') type: 'IN' | 'OUT',
    @Query('contactId') contactId?: string,
  ) {
    return this.warehouseService.getLastDocument(user.companyId, type, contactId);
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

  // ============================================================
  // OMBOR O'TKAZMALARI
  // ============================================================

  @Post('transfers')
  @ApiOperation({ summary: 'Yangi ombor o\'tkazmasi yaratish' })
  createTransfer(@CurrentUser() user: any, @Body() body: any) {
    return this.warehouseService.createTransfer(user.companyId, user.id, body)
  }

  @Get('transfers')
  @ApiOperation({ summary: 'O\'tkazmalar ro\'yxati' })
  listTransfers(@CurrentUser() user: any, @Query() query: any) {
    return this.warehouseService.listTransfers(user.companyId, {
      status: query.status,
      page:   query.page  ? Number(query.page)  : 1,
      limit:  query.limit ? Number(query.limit) : 20,
    })
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'O\'tkazma tafsiloti' })
  getTransfer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.getTransfer(user.companyId, id)
  }

  @Post('transfers/:id/confirm')
  @ApiOperation({ summary: 'O\'tkazmani tasdiqlash va stokni yangilash' })
  confirmTransfer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.confirmTransfer(user.companyId, id, user.id)
  }

  @Delete('transfers/:id')
  @ApiOperation({ summary: 'DRAFT o\'tkazmani o\'chirish' })
  cancelTransfer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.cancelTransfer(user.companyId, id)
  }
}
