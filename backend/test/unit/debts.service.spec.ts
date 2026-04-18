import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { DebtsService } from '../../src/modules/debts/debts.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('DebtsService', () => {
  let service: DebtsService
  let prisma: PrismaMock

  beforeEach(async () => {
    prisma = createPrismaMock()
    prisma.debtRecord = {
      findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(),
      update: jest.fn(), count: jest.fn(), aggregate: jest.fn(),
    } as any

    const module = await Test.createTestingModule({
      providers: [
        DebtsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(DebtsService)
  })

  describe('create', () => {
    it('creates debt record for valid contact', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'k1' })
      ;(prisma as any).debtRecord.create.mockResolvedValue({
        id: 'd1', amount: 500, remainAmount: 500, paidAmount: 0, contact: { id: 'k1', name: 'X' },
      })
      const res = await service.create('c1', { contactId: 'k1', type: 'RECEIVABLE', amount: 500 } as any)
      expect(res.success).toBe(true)
      expect(res.data.amount).toBe(500)
    })

    it('throws NotFoundException when contact missing', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)
      await expect(service.create('c1', { contactId: 'no', type: 'RECEIVABLE', amount: 100 } as any))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('addPayment', () => {
    it('reduces remain amount', async () => {
      ;(prisma as any).debtRecord.findFirst.mockResolvedValue({
        id: 'd1', amount: 1000, remainAmount: 1000, paidAmount: 0, dueDate: null,
      })
      ;(prisma as any).debtRecord.update.mockResolvedValue({
        id: 'd1', amount: 1000, remainAmount: 700, paidAmount: 300,
      })
      const res = await service.addPayment('c1', { debtId: 'd1', amount: 300 } as any)
      expect(res.data.remainAmount).toBe(700)
      expect(res.data.paidAmount).toBe(300)
    })

    it('caps payment at remain amount', async () => {
      ;(prisma as any).debtRecord.findFirst.mockResolvedValue({
        id: 'd1', amount: 500, remainAmount: 200, paidAmount: 300, dueDate: null,
      })
      ;(prisma as any).debtRecord.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'd1', ...data }),
      )
      const res = await service.addPayment('c1', { debtId: 'd1', amount: 1000 } as any)
      expect(res.data.remainAmount).toBe(0)
      expect(res.data.paidAmount).toBe(500)
    })

    it('throws NotFoundException when debt missing', async () => {
      ;(prisma as any).debtRecord.findFirst.mockResolvedValue(null)
      await expect(service.addPayment('c1', { debtId: 'no', amount: 100 } as any))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('getStats', () => {
    it('returns aggregate totals', async () => {
      ;(prisma as any).debtRecord.aggregate.mockResolvedValue({ _sum: { remainAmount: 0 }, _count: 0 })
      ;(prisma as any).debtRecord.findMany.mockResolvedValue([])
      const res = await service.getStats('c1')
      expect(res).toBeDefined()
    })
  })
})
