import {
  Controller, Get, Post, Body, Param, Headers, Res, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Response } from 'express'
import { BillingService } from './billing.service'
import { InvoiceService } from './invoice.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { PrismaService } from '../../prisma/prisma.service'

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly invoices: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Tariflar royxati' })
  plans() { return this.billing.getPlans() }

  @ApiBearerAuth('access-token')
  @Get('subscription')
  subscription(@CurrentUser() user: any) {
    return this.billing.getSubscription(user.companyId)
  }

  @ApiBearerAuth('access-token')
  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() dto: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) {
    return this.billing.createSubscription(user.companyId, dto.planId, dto.billingCycle || 'MONTHLY')
  }

  @ApiBearerAuth('access-token')
  @Post('cancel')
  cancel(@CurrentUser() user: any) {
    return this.billing.cancelSubscription(user.companyId)
  }

  @ApiBearerAuth('access-token')
  @Post('pay')
  pay(@CurrentUser() user: any, @Body() dto: any) {
    return this.billing.initiatePayment(user.companyId, dto)
  }

  @ApiBearerAuth('access-token')
  @Get('payments')
  payments(@CurrentUser() user: any) {
    return this.billing.getPaymentHistory(user.companyId)
  }

  @ApiBearerAuth('access-token')
  @Post('validate-promo')
  validatePromo(@Body() dto: { code: string; planId: string; amount: number }) {
    return this.billing.validatePromoCode(dto.code, dto.planId, dto.amount)
  }

  @ApiBearerAuth('access-token')
  @Get('invoice/:id/pdf')
  async invoicePdf(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const invoice = await this.prisma.billingInvoice.findFirst({ where: { id, companyId: user.companyId } })
    if (!invoice) return res.status(404).send('Not found')
    const company = await this.prisma.company.findUnique({ where: { id: user.companyId } })
    const html = this.invoices.generateInvoiceHtml(invoice, company)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(html)
  }

  @Public()
  @Post('webhook/payme')
  @HttpCode(HttpStatus.OK)
  paymeWebhook(@Headers('authorization') auth: string, @Body() body: any) {
    return this.billing.handlePaymeWebhook(auth, body)
  }

  @Public()
  @Post('webhook/click/prepare')
  @HttpCode(HttpStatus.OK)
  clickPrepare(@Body() body: any) {
    return this.billing.handleClickPrepare(body)
  }

  @Public()
  @Post('webhook/click/complete')
  @HttpCode(HttpStatus.OK)
  clickComplete(@Body() body: any) {
    return this.billing.handleClickComplete(body)
  }
}
