import {
  Controller, Get, Post, Delete, Body, Param,
  Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DebtsService, CreateDebtDto, AddPaymentDto } from './debts.service'
import { AvansService, CreateAvansDto } from './avans.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Debts')
@ApiBearerAuth('access-token')
@Controller('debts')
export class DebtsController {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly avansService: AvansService,
  ) {}

  // ─── Qarzlar ─────────────────────────────────────────────────────────────

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.debtsService.getStats(user.companyId)
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.debtsService.findAll(user.companyId, query)
  }

  @Get('contact/:contactId/balance')
  getContactBalance(@CurrentUser() user: any, @Param('contactId') contactId: string) {
    return this.debtsService.getContactBalance(user.companyId, contactId)
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.debtsService.findOne(id, user.companyId)
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(user.companyId, user.id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.debtsService.remove(id, user.companyId)
  }

  @Post('payment')
  addPayment(@CurrentUser() user: any, @Body() dto: AddPaymentDto) {
    return this.debtsService.addPayment(user.companyId, user.id, dto)
  }

  @Post(':id/send-reminder')
  @HttpCode(200)
  sendReminder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.debtsService.sendReminder(user.companyId, id)
  }

  // ─── Avans ───────────────────────────────────────────────────────────────

  @Get('avans/list')
  getAvans(@CurrentUser() user: any, @Query() query: any) {
    return this.avansService.findAll(user.companyId, query)
  }

  @Get('avans/stats')
  getAvansStats(@CurrentUser() user: any) {
    return this.avansService.getStats(user.companyId)
  }

  @Get('avans/contact/:contactId')
  getAvansByContact(@CurrentUser() user: any, @Param('contactId') contactId: string) {
    return this.avansService.getByContact(user.companyId, contactId)
  }

  @Post('avans')
  createAvans(@CurrentUser() user: any, @Body() dto: CreateAvansDto) {
    return this.avansService.create(user.companyId, user.id, dto)
  }

  @Delete('avans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAvans(@CurrentUser() user: any, @Param('id') id: string) {
    return this.avansService.remove(id, user.companyId)
  }

  @Post('avans/:avansId/apply/:debtId')
  @HttpCode(200)
  applyAvansToDebt(
    @CurrentUser() user: any,
    @Param('avansId') avansId: string,
    @Param('debtId') debtId: string,
    @Body() body: { amount: number },
  ) {
    return this.avansService.applyToDebt(user.companyId, user.id, avansId, debtId, body.amount)
  }
}
