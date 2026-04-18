import {
  Controller, Get, Post, Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DebtsService, CreateDebtDto, AddPaymentDto } from './debts.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Debts')
@ApiBearerAuth('access-token')
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.debtsService.getStats(user.companyId)
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.debtsService.findAll(user.companyId, query)
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(user.companyId, dto)
  }

  @Post('payment')
  addPayment(@CurrentUser() user: any, @Body() dto: AddPaymentDto) {
    return this.debtsService.addPayment(user.companyId, dto)
  }

  @Get('contact/:contactId')
  getByContact(
    @CurrentUser() user: any,
    @Param('contactId') contactId: string,
  ) {
    return this.debtsService.getByContact(user.companyId, contactId)
  }
}
