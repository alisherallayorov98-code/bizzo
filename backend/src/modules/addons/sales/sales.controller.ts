import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SalesService, CreateDealDto, UpdateDealDto, CreateInvoiceDto } from './sales.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'

@ApiTags('Sales CRM')
@ApiBearerAuth('access-token')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ===== STATISTIKA =====
  @Get('stats')
  @ApiOperation({ summary: 'Savdo statistikasi' })
  getStats(@CurrentUser() user: any) {
    return this.salesService.getStats(user.companyId)
  }

  // ===== PIPELINE =====
  @Get('pipeline')
  @ApiOperation({ summary: 'Pipeline (Kanban)' })
  getPipeline(
    @CurrentUser() user: any,
    @Query('search')       search?:       string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.salesService.getPipeline(user.companyId, { search, assignedToId })
  }

  // ===== DEALS =====
  @Post('deals')
  @ApiOperation({ summary: 'Yangi deal yaratish' })
  createDeal(@CurrentUser() user: any, @Body() dto: CreateDealDto) {
    return this.salesService.createDeal(user.companyId, dto, user.id)
  }

  @Get('deals')
  @ApiOperation({ summary: "Deallar ro'yxati" })
  getDeals(@CurrentUser() user: any, @Query() query: any) {
    return this.salesService.getDeals(user.companyId, query)
  }

  @Put('deals/:id')
  @ApiOperation({ summary: 'Deal tahrirlash' })
  updateDeal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.salesService.updateDeal(user.companyId, id, dto, user.id)
  }

  @Put('deals/:id/stage')
  @ApiOperation({ summary: "Bosqichni o'zgartirish" })
  updateStage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { stage: string; lostReason?: string },
  ) {
    return this.salesService.updateStage(user.companyId, id, body.stage, user.id, body.lostReason)
  }

  @Get('deals/:id')
  @ApiOperation({ summary: 'Deal detail' })
  getDeal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.getDeal(user.companyId, id)
  }

  @Get('deals/:id/activities')
  @ApiOperation({ summary: 'Deal aktivliklari' })
  getActivities(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.getActivities(user.companyId, id)
  }

  @Post('deals/:id/activities')
  @ApiOperation({ summary: "Aktivlik qo'shish" })
  addActivity(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { type: string; title: string; description?: string; dueDate?: string; completedAt?: string },
  ) {
    return this.salesService.addActivity(user.companyId, id, dto, user.id)
  }

  @Delete('deals')
  @ApiOperation({ summary: "Deallarni ommaviy o'chirish" })
  bulkDeleteDeals(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.salesService.bulkDeleteDeals(user.companyId, body.ids)
  }

  // ===== INVOICES =====
  @Post('invoices')
  @ApiOperation({ summary: 'Invoice yaratish' })
  createInvoice(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    return this.salesService.createInvoice(user.companyId, dto, user.id)
  }

  @Get('invoices')
  @ApiOperation({ summary: "Invoicelar ro'yxati" })
  getInvoices(@CurrentUser() user: any, @Query() query: any) {
    return this.salesService.getInvoices(user.companyId, query)
  }

  @Delete('invoices')
  @ApiOperation({ summary: "Invoicelarni ommaviy o'chirish" })
  bulkDeleteInvoices(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.salesService.bulkDeleteInvoices(user.companyId, body.ids)
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Invoice detail' })
  getInvoice(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.getInvoice(user.companyId, id)
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Invoice statusini yangilash' })
  updateInvoiceStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.salesService.updateInvoiceStatus(user.companyId, id, body.status)
  }

  @Post('invoices/:id/payments')
  @ApiOperation({ summary: "To'lov qo'shish" })
  addPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { amount: number; method: string; notes?: string },
  ) {
    return this.salesService.addPayment(
      user.companyId, id, body.amount, body.method, user.id, body.notes,
    )
  }
}
