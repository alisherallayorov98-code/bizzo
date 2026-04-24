import {
  Controller, Get, Post, Put,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  WasteService,
  CreateBatchDto,
  CreateProcessingDto,
  QueryBatchDto,
} from './waste.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Waste Management')
@ApiBearerAuth('access-token')
@Controller('waste')
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  // ============================================
  // DASHBOARD
  // ============================================
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard statistikasi' })
  getDashboard(@CurrentUser() user: any) {
    return this.wasteService.getDashboardStats(user.companyId);
  }

  // ============================================
  // SIFAT TURLARI
  // ============================================
  @Get('quality-types')
  getQualityTypes(@CurrentUser() user: any) {
    return this.wasteService.getQualityTypes(user.companyId);
  }

  @Post('quality-types')
  createQualityType(@CurrentUser() user: any, @Body() dto: any) {
    return this.wasteService.createQualityType(user.companyId, dto);
  }

  // ============================================
  // PARTIYALAR
  // ============================================
  @Post('batches')
  @ApiOperation({ summary: 'Yangi partiya qabul qilish' })
  createBatch(@CurrentUser() user: any, @Body() dto: CreateBatchDto) {
    return this.wasteService.createBatch(user.companyId, dto, user.id);
  }

  @Get('batches')
  @ApiOperation({ summary: "Partiyalar ro'yxati" })
  getBatches(@CurrentUser() user: any, @Query() query: QueryBatchDto) {
    return this.wasteService.getBatches(user.companyId, query);
  }

  // ============================================
  // QAYTA ISHLASH
  // ============================================
  @Post('processing')
  @ApiOperation({ summary: 'Qayta ishlash yozuvi' })
  createProcessing(@CurrentUser() user: any, @Body() dto: CreateProcessingDto) {
    return this.wasteService.createProcessing(user.companyId, dto, user.id);
  }

  // ============================================
  // TAHLIL
  // ============================================
  @Get('analytics')
  @ApiOperation({ summary: "Yo'qotish tahlili" })
  getAnalytics(
    @CurrentUser() user: any,
    @Query('dateFrom')   dateFrom?:   string,
    @Query('dateTo')     dateTo?:     string,
    @Query('sourceType') sourceType?: string,
  ) {
    return this.wasteService.getLossAnalytics(user.companyId, {
      dateFrom, dateTo, sourceType,
    });
  }

  // ============================================
  // BITTA PARTIYA DETALI
  // ============================================
  @Get('batches/:id')
  @ApiOperation({ summary: 'Partiya detallari' })
  getBatchById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.wasteService.getBatchById(user.companyId, id);
  }

  // ============================================
  // PARTIYANI SOTISH
  // ============================================
  @Put('batches/:id/sell')
  @ApiOperation({ summary: 'Partiyani sotish' })
  sellBatch(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { buyerId: string; sellPricePerKg: number; weight: number; notes?: string },
  ) {
    return this.wasteService.sellBatch(user.companyId, id, body);
  }

  // ============================================
  // XODIM TAYINLASH
  // ============================================
  @Post('batches/:id/workers')
  @ApiOperation({ summary: 'Partiyaga xodim tayinlash' })
  assignWorker(
    @CurrentUser() user: any,
    @Param('id') batchId: string,
    @Body() body: any,
  ) {
    return this.wasteService.assignWorker(user.companyId, { ...body, batchId });
  }

  // ============================================
  // XODIMLAR HISOBOTI
  // ============================================
  @Get('workers-report')
  @ApiOperation({ summary: "Xodimlar ish hisoboti" })
  getWorkersReport(
    @CurrentUser() user: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:   string,
  ) {
    return this.wasteService.getWorkersReport(user.companyId, { dateFrom, dateTo });
  }
}
