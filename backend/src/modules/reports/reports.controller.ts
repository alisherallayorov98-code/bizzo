import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ReportsService, ReportFilters } from './reports.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getFinancial(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getFinancialReport(user.companyId, filters)
  }

  @Get('warehouse')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getWarehouse(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getWarehouseReport(user.companyId, filters)
  }

  @Get('sales')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getSales(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getSalesReport(user.companyId, filters)
  }

  @Get('employees')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getEmployees(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getEmployeesReport(user.companyId, filters)
  }

  @Get('waste')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getWaste(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getWasteReport(user.companyId, filters)
  }

  @Get('construction')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getConstruction(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getConstructionReport(user.companyId, filters)
  }

  @Get('production')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getProduction(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getProductionReport(user.companyId, filters)
  }

  @Get('charts')
  getCharts(@CurrentUser() user: any) {
    return this.reportsService.getChartsData(user.companyId)
  }

  @Get('pnl')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getPnL(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getPnLReport(user.companyId, filters)
  }

  @Get('balance-sheet')
  getBalanceSheet(@CurrentUser() user: any) {
    return this.reportsService.getBalanceSheet(user.companyId)
  }

  @Get('cash-flow')
  @ApiQuery({ name: 'dateFrom', example: '2025-01-01' })
  @ApiQuery({ name: 'dateTo',   example: '2025-12-31' })
  getCashFlow(@CurrentUser() user: any, @Query() filters: ReportFilters) {
    return this.reportsService.getCashFlow(user.companyId, filters)
  }
}
