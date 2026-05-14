import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SalesForecastService } from './sales-forecast.service'

@UseGuards(JwtAuthGuard)
@Controller('sales-forecast')
export class SalesForecastController {
  constructor(private readonly svc: SalesForecastService) {}

  @Post('target')
  setTarget(@Req() req: any, @Body() body: any) {
    return this.svc.setTarget(req.user.companyId, body)
  }

  @Get('targets')
  getTargets(@Req() req: any, @Query('period') period: string) {
    return this.svc.getTargets(req.user.companyId, period ?? new Date().toISOString().slice(0, 7))
  }

  @Get('forecast')
  getForecast(@Req() req: any, @Query('year') year: string) {
    return this.svc.getForecastData(req.user.companyId, year ? Number(year) : new Date().getFullYear())
  }

  @Get('kpi')
  getKpi(@Req() req: any, @Query('period') period: string) {
    return this.svc.getSalespersonKPI(req.user.companyId, period ?? new Date().toISOString().slice(0, 7))
  }
}
