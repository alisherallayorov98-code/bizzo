import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { BillingService } from '../../src/modules/billing/billing.service'
import { InvoiceService } from '../../src/modules/billing/invoice.service'
import { PaymeService } from '../../src/modules/integrations/payme.service'
import { ClickService } from '../../src/modules/integrations/click.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('BillingService', () => {
  let service: BillingService
  let prisma: PrismaMock
  let invoices: { createInvoice: jest.Mock; generateInvoiceHtml: jest.Mock }
  let payme: { createCheckoutUrl: jest.Mock; verifyAuth: jest.Mock }
  let click: { createCheckoutUrl: jest.Mock; verifySignature: jest.Mock }

  beforeEach(async () => {
    prisma = createPrismaMock()
    invoices = {
      createInvoice: jest.fn().mockResolvedValue({ id: 'inv1', total: 112000 }),
      generateInvoiceHtml: jest.fn().mockReturnValue('<html/>'),
    }
    payme = { createCheckoutUrl: jest.fn().mockReturnValue('https://pay/xyz'), verifyAuth: jest.fn().mockReturnValue(true) }
    click = { createCheckoutUrl: jest.fn().mockReturnValue('https://click/xyz'), verifySignature: jest.fn().mockReturnValue(true) }

    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: InvoiceService, useValue: invoices },
        { provide: PaymeService, useValue: payme },
        { provide: ClickService, useValue: click },
      ],
    }).compile()

    service = module.get(BillingService)
  })

  describe('getPlans', () => {
    it('returns active plans sorted', async () => {
      prisma.billingPlan.findMany.mockResolvedValue([{ id: 'p1' }])
      await service.getPlans()
      expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
    })
  })

  describe('createSubscription', () => {
    it('creates subscription with 14-day trial', async () => {
      prisma.billingPlan.findUnique.mockResolvedValue({ id: 'p1', name: 'STARTER' })
      prisma.subscription.findUnique.mockResolvedValue(null)
      prisma.subscription.create.mockResolvedValue({ id: 's1' })
      const res = await service.createSubscription('c1', 'p1')
      expect(res.id).toBe('s1')
      const arg = prisma.subscription.create.mock.calls[0][0]
      expect(arg.data.status).toBe('TRIALING')
      expect(arg.data.trialEndsAt).toBeInstanceOf(Date)
    })

    it('throws BadRequestException when subscription exists', async () => {
      prisma.billingPlan.findUnique.mockResolvedValue({ id: 'p1' })
      prisma.subscription.findUnique.mockResolvedValue({ id: 's1' })
      await expect(service.createSubscription('c1', 'p1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('validatePromoCode', () => {
    it('validates PERCENT promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue({
        code: 'SAVE20', discountType: 'PERCENT', discountValue: 20,
        maxUses: null, usedCount: 0, minAmount: 0,
        applicablePlans: [], validFrom: new Date('2020-01-01'), validUntil: null,
        isActive: true,
      })
      const res = await service.validatePromoCode('SAVE20', 'p1', 100000)
      expect(res.discount).toBe(20000)
    })

    it('throws on unknown promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(null)
      await expect(service.validatePromoCode('X', 'p1', 1000)).rejects.toThrow(BadRequestException)
    })

    it('throws on expired promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue({
        code: 'OLD', discountType: 'FIXED', discountValue: 1000,
        maxUses: null, usedCount: 0, minAmount: 0, applicablePlans: [],
        validFrom: new Date('2020-01-01'), validUntil: new Date('2020-12-31'),
        isActive: true,
      })
      await expect(service.validatePromoCode('OLD', 'p1', 1000)).rejects.toThrow(BadRequestException)
    })

    it('throws when usage limit exhausted', async () => {
      prisma.promoCode.findUnique.mockResolvedValue({
        code: 'FULL', discountType: 'FIXED', discountValue: 1000,
        maxUses: 5, usedCount: 5, minAmount: 0, applicablePlans: [],
        validFrom: new Date('2020-01-01'), validUntil: null, isActive: true,
      })
      await expect(service.validatePromoCode('FULL', 'p1', 1000)).rejects.toThrow(BadRequestException)
    })
  })

  describe('initiatePayment', () => {
    it('returns Payme checkout URL', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 's1' })
      prisma.billingPlan.findUnique.mockResolvedValue({ id: 'p1', displayName: 'Starter', priceMonthly: 99000, priceYearly: 950000 })
      prisma.billingPayment.create.mockResolvedValue({ id: 'pay1' })

      const res = await service.initiatePayment('c1', {
        planId: 'p1', billingCycle: 'MONTHLY', provider: 'PAYME',
      })
      expect(res.checkoutUrl).toBe('https://pay/xyz')
      expect(payme.createCheckoutUrl).toHaveBeenCalled()
    })

    it('rejects payment on free plan', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 's1' })
      prisma.billingPlan.findUnique.mockResolvedValue({ id: 'p1', priceMonthly: 0, priceYearly: 0 })
      await expect(service.initiatePayment('c1', { planId: 'p1', billingCycle: 'MONTHLY', provider: 'PAYME' }))
        .rejects.toThrow(BadRequestException)
    })
  })

  describe('handlePaymeWebhook', () => {
    it('returns unauthorized error when auth fails', async () => {
      payme.verifyAuth.mockReturnValue(false)
      const res = await service.handlePaymeWebhook('bad', { id: 123 })
      expect((res as any).error.code).toBe(-32504)
    })

    it('handles CheckPerformTransaction for valid invoice', async () => {
      prisma.billingInvoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'PENDING', total: 1120 })
      const res = await service.handlePaymeWebhook('Basic xxx', {
        method: 'CheckPerformTransaction',
        params: { account: { invoice_id: 'inv1' }, amount: 112000 },
        id: 1,
      })
      expect((res as any).result.allow).toBe(true)
    })

    it('returns INVOICE_NOT_FOUND when invoice missing', async () => {
      prisma.billingInvoice.findUnique.mockResolvedValue(null)
      const res = await service.handlePaymeWebhook('Basic xxx', {
        method: 'CheckPerformTransaction',
        params: { account: { invoice_id: 'nope' }, amount: 100 },
        id: 1,
      })
      expect((res as any).error.code).toBe(-31050)
    })
  })
})
