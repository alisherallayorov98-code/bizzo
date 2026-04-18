import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceService } from './invoice.service'
import { PaymeService } from '../integrations/payme.service'
import { ClickService } from '../integrations/click.service'

const PAYME_ERR = {
  INVALID_AMOUNT: { code: -31001, message: { uz: 'Notogri summa', ru: 'Неверная сумма', en: 'Invalid amount' } },
  INVOICE_NOT_FOUND: { code: -31050, message: { uz: 'Hisob topilmadi', ru: 'Счёт не найден', en: 'Invoice not found' } },
  INVOICE_UNPAYABLE: { code: -31051, message: { uz: 'Hisob tolashga yaroqsiz', ru: 'Счёт нельзя оплатить', en: 'Cannot pay' } },
  UNAUTHORIZED: { code: -32504, message: { uz: 'Ruxsat yoq', ru: 'Нет доступа', en: 'Unauthorized' } },
  TRANSACTION_NOT_FOUND: { code: -31003, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } },
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)

  constructor(
    private prisma: PrismaService,
    private invoices: InvoiceService,
    private payme: PaymeService,
    private click: ClickService,
  ) {}

  getPlans() {
    return this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async getSubscription(companyId: string) {
    return this.prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    })
  }

  async createSubscription(companyId: string, planId: string, billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
    const plan = await this.prisma.billingPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new NotFoundException('Tarif topilmadi')

    const existing = await this.prisma.subscription.findUnique({ where: { companyId } })
    if (existing) throw new BadRequestException('Obuna allaqachon mavjud')

    const now = new Date()
    const trialEnd = new Date(now); trialEnd.setDate(trialEnd.getDate() + 14)
    const periodEnd = new Date(trialEnd)

    return this.prisma.subscription.create({
      data: {
        companyId,
        planId,
        status: 'TRIALING',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEnd,
        nextBillingDate: trialEnd,
      },
      include: { plan: true },
    })
  }

  async cancelSubscription(companyId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { companyId } })
    if (!sub) throw new NotFoundException('Obuna topilmadi')
    return this.prisma.subscription.update({
      where: { companyId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })
  }

  async validatePromoCode(code: string, planId: string, amount: number) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } })
    if (!promo || !promo.isActive) throw new BadRequestException('Promokod topilmadi')
    const now = new Date()
    if (promo.validUntil && promo.validUntil < now) throw new BadRequestException('Promokod muddati otgan')
    if (promo.validFrom > now) throw new BadRequestException('Promokod hali faol emas')
    if (promo.maxUses && promo.usedCount >= promo.maxUses) throw new BadRequestException('Promokod limiti tugagan')
    if (amount < promo.minAmount) throw new BadRequestException('Minimal summa yetarli emas')
    if (promo.applicablePlans.length && !promo.applicablePlans.includes(planId)) {
      throw new BadRequestException('Bu tarif uchun amal qilmaydi')
    }
    const discount = promo.discountType === 'PERCENT'
      ? Math.round(amount * promo.discountValue / 100)
      : promo.discountValue
    return { code: promo.code, discount, discountType: promo.discountType, discountValue: promo.discountValue }
  }

  async initiatePayment(companyId: string, params: {
    planId: string
    billingCycle: 'MONTHLY' | 'YEARLY'
    provider: 'PAYME' | 'CLICK'
    promoCode?: string
    returnUrl?: string
    billingName?: string
    billingStir?: string
    billingAddress?: string
  }) {
    let subscription = await this.prisma.subscription.findUnique({ where: { companyId } })
    if (!subscription) {
      subscription = await this.createSubscription(companyId, params.planId, params.billingCycle)
    }
    const plan = await this.prisma.billingPlan.findUnique({ where: { id: params.planId } })
    if (!plan) throw new NotFoundException('Tarif topilmadi')

    const subtotal = params.billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
    if (subtotal <= 0) throw new BadRequestException('Bepul tarif uchun tolov kerak emas')

    let discount = 0
    if (params.promoCode) {
      const p = await this.validatePromoCode(params.promoCode, params.planId, subtotal)
      discount = p.discount
    }

    const invoice = await this.invoices.createInvoice({
      companyId,
      subscriptionId: subscription.id,
      subtotal,
      discount,
      lineItems: [{ description: `${plan.displayName} (${params.billingCycle})`, amount: subtotal }],
      billingName: params.billingName,
      billingStir: params.billingStir,
      billingAddress: params.billingAddress,
    })

    const payment = await this.prisma.billingPayment.create({
      data: {
        companyId, subscriptionId: subscription.id, invoiceId: invoice.id,
        amount: invoice.total, provider: params.provider, status: 'PENDING',
      },
    })

    const checkoutUrl = params.provider === 'PAYME'
      ? this.payme.createCheckoutUrl({ invoiceId: invoice.id, amount: invoice.total, returnUrl: params.returnUrl })
      : this.click.createCheckoutUrl({ invoiceId: invoice.id, amount: invoice.total, returnUrl: params.returnUrl })

    return { invoice, payment, checkoutUrl }
  }

  async getPaymentHistory(companyId: string) {
    return this.prisma.billingPayment.findMany({
      where: { companyId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async handlePaymeWebhook(authHeader: string | undefined, body: any) {
    if (!this.payme.verifyAuth(authHeader)) {
      return { error: PAYME_ERR.UNAUTHORIZED, id: body?.id }
    }
    const { method, params, id } = body || {}
    try {
      switch (method) {
        case 'CheckPerformTransaction': return { result: await this.paymeCheckPerform(params), id }
        case 'CreateTransaction':       return { result: await this.paymeCreate(params), id }
        case 'PerformTransaction':      return { result: await this.paymePerform(params), id }
        case 'CancelTransaction':       return { result: await this.paymeCancel(params), id }
        case 'CheckTransaction':        return { result: await this.paymeCheck(params), id }
        default: return { error: { code: -32601, message: { en: 'Method not found' } }, id }
      }
    } catch (e: any) {
      this.logger.error('payme webhook', e)
      return { error: e.paymeError || { code: -32400, message: { en: e.message } }, id }
    }
  }

  private async paymeCheckPerform(params: any) {
    const invoiceId = params?.account?.invoice_id
    const invoice = await this.prisma.billingInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) throw { paymeError: PAYME_ERR.INVOICE_NOT_FOUND }
    if (invoice.status === 'PAID' || invoice.status === 'VOID') throw { paymeError: PAYME_ERR.INVOICE_UNPAYABLE }
    if (params.amount !== invoice.total * 100) throw { paymeError: PAYME_ERR.INVALID_AMOUNT }
    return { allow: true }
  }

  private async paymeCreate(params: any) {
    const invoiceId = params?.account?.invoice_id
    const invoice = await this.prisma.billingInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) throw { paymeError: PAYME_ERR.INVOICE_NOT_FOUND }
    if (params.amount !== invoice.total * 100) throw { paymeError: PAYME_ERR.INVALID_AMOUNT }

    let payment = await this.prisma.billingPayment.findFirst({
      where: { invoiceId, provider: 'PAYME', providerPaymentId: params.id },
    })
    if (!payment) {
      payment = await this.prisma.billingPayment.findFirst({
        where: { invoiceId, provider: 'PAYME', status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      })
      if (!payment) throw { paymeError: PAYME_ERR.TRANSACTION_NOT_FOUND }
      payment = await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { providerPaymentId: params.id, status: 'PROCESSING', metadata: { paymeTime: params.time } as any },
      })
    }
    return { create_time: params.time, transaction: payment.id, state: 1 }
  }

  private async paymePerform(params: any) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { provider: 'PAYME', providerPaymentId: params.id },
    })
    if (!payment) throw { paymeError: PAYME_ERR.TRANSACTION_NOT_FOUND }
    const performTime = Date.now()
    if (payment.status !== 'COMPLETED') {
      await this.prisma.$transaction([
        this.prisma.billingPayment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', completedAt: new Date(performTime) },
        }),
        this.prisma.billingInvoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'PAID', paidAt: new Date(performTime) },
        }),
        this.prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: 'ACTIVE',
            lastPaymentAt: new Date(performTime),
            lastPaymentAmount: payment.amount,
          },
        }),
      ])
    }
    return { perform_time: performTime, transaction: payment.id, state: 2 }
  }

  private async paymeCancel(params: any) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { provider: 'PAYME', providerPaymentId: params.id },
    })
    if (!payment) throw { paymeError: PAYME_ERR.TRANSACTION_NOT_FOUND }
    const cancelTime = Date.now()
    const state = payment.status === 'COMPLETED' ? -2 : -1
    await this.prisma.billingPayment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', errorMessage: `canceled reason=${params.reason}` },
    })
    return { cancel_time: cancelTime, transaction: payment.id, state }
  }

  private async paymeCheck(params: any) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { provider: 'PAYME', providerPaymentId: params.id },
    })
    if (!payment) throw { paymeError: PAYME_ERR.TRANSACTION_NOT_FOUND }
    let state = 1
    if (payment.status === 'COMPLETED') state = 2
    else if (payment.status === 'FAILED') state = -1
    return {
      create_time: payment.createdAt.getTime(),
      perform_time: payment.completedAt?.getTime() || 0,
      cancel_time: 0,
      transaction: payment.id,
      state,
      reason: null,
    }
  }

  async handleClickPrepare(body: any) {
    if (!this.click.verifySignature(body)) {
      return { error: -1, error_note: 'SIGN CHECK FAILED' }
    }
    const invoice = await this.prisma.billingInvoice.findUnique({ where: { id: body.merchant_trans_id } })
    if (!invoice) return { error: -5, error_note: 'Invoice not found' }
    if (invoice.status === 'PAID') return { error: -4, error_note: 'Already paid' }
    if (Number(body.amount) !== invoice.total) return { error: -2, error_note: 'Invalid amount' }

    const payment = await this.prisma.billingPayment.findFirst({
      where: { invoiceId: invoice.id, provider: 'CLICK', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })
    if (!payment) return { error: -6, error_note: 'Payment not found' }

    await this.prisma.billingPayment.update({
      where: { id: payment.id },
      data: { status: 'PROCESSING', providerPaymentId: String(body.click_trans_id) },
    })

    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: 'Success',
    }
  }

  async handleClickComplete(body: any) {
    if (!this.click.verifySignature(body)) {
      return { error: -1, error_note: 'SIGN CHECK FAILED' }
    }
    const payment = await this.prisma.billingPayment.findUnique({ where: { id: body.merchant_prepare_id } })
    if (!payment) return { error: -6, error_note: 'Payment not found' }

    if (Number(body.error) < 0) {
      await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', errorMessage: body.error_note },
      })
      return {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: body.merchant_trans_id,
        merchant_confirm_id: payment.id,
        error: Number(body.error),
        error_note: body.error_note,
      }
    }

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      this.prisma.billingInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: 'PAID', paidAt: now },
      }),
      this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE', lastPaymentAt: now, lastPaymentAmount: payment.amount },
      }),
    ])

    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: 0,
      error_note: 'Success',
    }
  }
}
