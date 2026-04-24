import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SmartAnalyticsService } from './smart-analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Smart Analytics')
@ApiBearerAuth('access-token')
@Controller('smart')
export class SmartAnalyticsController {
  constructor(private readonly service: SmartAnalyticsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Business Health Score (0-100)' })
  getHealthScore(@CurrentUser() user: any) {
    return this.service.getHealthScore(user.companyId);
  }

  @Get('abc')
  @ApiOperation({ summary: 'ABC tahlil — mahsulotlar daromadi' })
  getABC(@CurrentUser() user: any) {
    return this.service.getABCAnalysis(user.companyId);
  }

  @Get('rfm')
  @ApiOperation({ summary: 'RFM tahlil — mijozlar segmentatsiyasi' })
  getRFM(@CurrentUser() user: any) {
    return this.service.getRFMAnalysis(user.companyId);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Savdo bashorati (keyingi oy)' })
  getForecast(@CurrentUser() user: any) {
    return this.service.getSalesForecast(user.companyId);
  }

  @Get('depletion')
  @ApiOperation({ summary: 'Stock tugash bashorati' })
  getDepletion(@CurrentUser() user: any) {
    return this.service.getStockDepletion(user.companyId);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Anomaliya aniqlash' })
  getAnomalies(@CurrentUser() user: any) {
    return this.service.getAnomalies(user.companyId);
  }

  @Get('digest')
  @ApiOperation({ summary: 'Morning digest — kunlik xulosa' })
  getDigest(@CurrentUser() user: any) {
    return this.service.getMorningDigest(user.companyId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Smart ogohlantirishlar' })
  getAlerts(@CurrentUser() user: any) {
    return this.service.getSmartAlerts(user.companyId);
  }

  @Get('ai-context')
  @ApiOperation({ summary: 'AI uchun biznes kontekst matni' })
  getAIContext(@CurrentUser() user: any) {
    return this.service.getAIContext(user.companyId);
  }
}
