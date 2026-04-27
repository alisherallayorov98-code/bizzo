import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import {
  CashExpensesService, CreateCashExpenseDto, QueryCashExpenseDto,
} from './cash-expenses.service'
import { DriversService, CreateDriverDto } from './drivers.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('CashExpenses')
@ApiBearerAuth('access-token')
@Controller('cash-expenses')
export class CashExpensesController {
  constructor(
    private readonly service: CashExpensesService,
    private readonly drivers: DriversService,
  ) {}

  // ============================================
  // KASSA XARAJATLARI
  // ============================================
  @Get()
  @ApiOperation({ summary: "Kassa xarajatlari ro'yxati" })
  findAll(@CurrentUser() user: any, @Query() query: QueryCashExpenseDto) {
    return this.service.findAll(user.companyId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Kassa xarajat statistikasi' })
  getStats(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getStats(user.companyId, { from, to })
  }

  @Get('today-summary')
  @ApiOperation({ summary: 'Bugungi xarajatlar (Dashboard widget uchun)' })
  getTodaySummary(@CurrentUser() user: any) {
    return this.service.getTodaySummary(user.companyId)
  }

  @Post()
  @ApiOperation({ summary: 'Kassadan chiqim yozish' })
  create(@CurrentUser() user: any, @Body() dto: CreateCashExpenseDto) {
    return this.service.create(user.companyId, dto, user.id)
  }

  // ============================================
  // HAYDOVCHILAR — :id dan oldin!
  // ============================================
  @Get('drivers')
  @ApiOperation({ summary: "Haydovchilar ro'yxati" })
  listDrivers(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.drivers.findAll(user.companyId, search, permanent === 'true')
  }

  @Post('drivers')
  @ApiOperation({ summary: 'Yangi haydovchi qo\'shish' })
  createDriver(@CurrentUser() user: any, @Body() dto: CreateDriverDto) {
    return this.drivers.create(user.companyId, dto)
  }

  @Put('drivers/:id')
  @ApiOperation({ summary: "Haydovchi ma'lumotlarini yangilash" })
  updateDriver(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDriverDto>,
  ) {
    return this.drivers.update(user.companyId, id, dto)
  }

  @Delete('drivers/:id')
  @ApiOperation({ summary: 'Haydovchini o\'chirish' })
  deleteDriver(@CurrentUser() user: any, @Param('id') id: string) {
    return this.drivers.remove(user.companyId, id)
  }

  // ============================================
  // BITTA XARAJAT — :id eng oxirida bo'lishi shart
  // ============================================
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.companyId, id)
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCashExpenseDto>,
  ) {
    return this.service.update(user.companyId, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.companyId, id)
  }
}
