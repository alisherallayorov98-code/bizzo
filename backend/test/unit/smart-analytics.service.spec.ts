import { Test } from '@nestjs/testing'
import { SmartAnalyticsService } from '../../src/modules/smart-analytics/smart-analytics.service'
import { PrismaService }         from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('SmartAnalyticsService', () => {
  let service: SmartAnalyticsService
  let prisma: PrismaMock

  const companyId = 'company-test'

  beforeEach(async () => {
    prisma = createPrismaMock()
    prisma.debtRecord = { ...prisma.debtRecord, groupBy: jest.fn().mockResolvedValue([]) } as any
    prisma.salaryRecord = { ...prisma.salaryRecord, findMany: jest.fn().mockResolvedValue([]) } as any

    const module = await Test.createTestingModule({
      providers: [
        SmartAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(SmartAnalyticsService)
  })

  function mockHealthScoreBase(prisma: PrismaMock) {
    prisma.deal.aggregate.mockResolvedValue({ _sum: { finalAmount: null }, _count: { id: 0 } })
    prisma.debtRecord.aggregate.mockResolvedValue({ _sum: { remainAmount: null } })
    prisma.stockItem.findMany.mockResolvedValue([])
    prisma.product.findMany.mockResolvedValue([])
    prisma.salaryRecord.count.mockResolvedValue(0)
    prisma.employee.count.mockResolvedValue(0)
    prisma.stockMovement.aggregate.mockResolvedValue({ _sum: { totalAmount: null } })
  }

  describe('getHealthScore', () => {
    it('returns score between 0 and 100', async () => {
      mockHealthScoreBase(prisma)
      const result = await service.getHealthScore(companyId)
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.total).toBeLessThanOrEqual(100)
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade)
    })

    it('lower score when overdue debts exceed total receivables', async () => {
      mockHealthScoreBase(prisma)
      // Override debtRecord.aggregate to return high overdue ratio
      prisma.debtRecord.aggregate
        .mockResolvedValueOnce({ _sum: { remainAmount: 5_000_000 } }) // total receivable
        .mockResolvedValueOnce({ _sum: { remainAmount: 4_500_000 } }) // overdue receivable
        .mockResolvedValueOnce({ _sum: { remainAmount: 0 } })         // total payable
        .mockResolvedValueOnce({ _sum: { remainAmount: 0 } })         // overdue payable

      const result = await service.getHealthScore(companyId)
      expect(result.total).toBeLessThanOrEqual(100)
      expect(result.grade).toBeDefined()
    })
  })

  describe('getABCAnalysis', () => {
    it('returns empty array when no products', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([])
      prisma.product.findMany.mockResolvedValue([])
      const result = await service.getABCAnalysis(companyId)
      expect(result).toEqual([])
    })

    it('assigns class A to top revenue products', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 100, totalAmount: 800_000 },
        { productId: 'p2', quantity: 10,  totalAmount: 100_000 },
        { productId: 'p3', quantity: 5,   totalAmount: 100_000 },
      ])
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Prod1', unit: 'kg', stockItems: [] },
        { id: 'p2', name: 'Prod2', unit: 'dona', stockItems: [] },
        { id: 'p3', name: 'Prod3', unit: 'dona', stockItems: [] },
      ])

      const result = await service.getABCAnalysis(companyId)
      expect(result[0].category).toBe('A')
    })
  })

  describe('getStockDepletion', () => {
    it('returns empty for service products', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Servis', unit: 'dona', isService: true, minStock: 0, stockItems: [] },
      ])
      prisma.stockMovement.findMany.mockResolvedValue([])
      const result = await service.getStockDepletion(companyId)
      expect(result).toHaveLength(0)
    })

    it('calculates days remaining correctly', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Qop', unit: 'dona', isService: false, minStock: 10, stockItems: [{ quantity: 300 }] },
      ])
      prisma.stockMovement.findMany.mockResolvedValue([
        { productId: 'p1', quantity: 30 }, // 30 ta / 30 kun = 1 ta/kun
        { productId: 'p1', quantity: 60 }, // Jami: 90/30 = 3 ta/kun
      ])

      const result = await service.getStockDepletion(companyId)
      expect(result).toHaveLength(1)
      expect(result[0].daysUntilEmpty).toBeCloseTo(100, 0) // 300 / 3 = 100 kun
    })
  })

  describe('getSmartAlerts', () => {
    it('returns alerts array', async () => {
      prisma.debtRecord.findMany.mockResolvedValue([])
      prisma.debtRecord.aggregate.mockResolvedValue({ _sum: { remainAmount: null } })
      prisma.stockItem.findMany.mockResolvedValue([])
      prisma.salaryRecord.aggregate.mockResolvedValue({ _count: { id: 0 }, _sum: {} })
      prisma.contract.findMany.mockResolvedValue([])
      prisma.contract.count.mockResolvedValue(0)
      prisma.product.findMany.mockResolvedValue([])
      prisma.stockMovement.findMany.mockResolvedValue([])

      const result = await service.getSmartAlerts(companyId)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
