import { Test } from '@nestjs/testing'
import { NotificationsService } from '../../src/modules/notifications/notifications.service'
import { PrismaService }        from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('NotificationsService', () => {
  let service: NotificationsService
  let prisma: PrismaMock

  beforeEach(async () => {
    prisma  = createPrismaMock()
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(NotificationsService)
  })

  describe('getForCompany', () => {
    it('returns items and unreadCount', async () => {
      const mockItems = [{ id: '1', title: 'Test', isRead: false }]
      prisma.notification.findMany.mockResolvedValue(mockItems)
      prisma.notification.count.mockResolvedValue(1)

      const result = await service.getForCompany('company-1')
      expect(result.items).toEqual(mockItems)
      expect(result.unreadCount).toBe(1)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1' } }),
      )
    })

    it('respects custom limit', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      prisma.notification.count.mockResolvedValue(0)
      await service.getForCompany('c1', 5)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      )
    })
  })

  describe('markRead', () => {
    it('updates only matching company notification', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 })
      await service.markRead('notif-1', 'company-1')
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', companyId: 'company-1' },
        data:  { isRead: true },
      })
    })
  })

  describe('markAllRead', () => {
    it('marks all unread as read for company', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 })
      await service.markAllRead('company-1')
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isRead: false },
        data:  { isRead: true },
      })
    })
  })

  describe('create', () => {
    it('creates notification with correct data', async () => {
      const notif = { id: 'n1', companyId: 'c1', title: 'Test', message: 'Msg', type: 'warning', category: 'stock' }
      prisma.notification.create.mockResolvedValue(notif)

      const result = await service.create({
        companyId: 'c1', title: 'Test', message: 'Msg',
        type: 'warning', category: 'stock',
      })
      expect(result).toEqual(notif)
      expect(prisma.notification.create).toHaveBeenCalled()
    })
  })

  describe('refreshSmartNotifications', () => {
    it('returns 0 when no alerts', async () => {
      prisma.product.findMany.mockResolvedValue([])
      prisma.debtRecord.findMany.mockResolvedValue([])
      prisma.salaryRecord.count.mockResolvedValue(0)
      prisma.contract.findMany.mockResolvedValue([])

      const count = await service.refreshSmartNotifications('c1')
      expect(count).toBe(0)
      expect(prisma.notification.deleteMany).not.toHaveBeenCalled()
    })

    it('creates alerts for low stock products', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1', name: 'Polipropilen', unit: 'kg', minStock: 100,
          stockItems: [{ quantity: 50 }],
        },
      ])
      prisma.debtRecord.findMany.mockResolvedValue([])
      prisma.salaryRecord.count.mockResolvedValue(0)
      prisma.contract.findMany.mockResolvedValue([])
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 })
      prisma.notification.createMany.mockResolvedValue({ count: 1 })

      const count = await service.refreshSmartNotifications('c1')
      expect(count).toBe(1)
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ category: 'stock', type: 'warning' }),
          ]),
        }),
      )
    })

    it('creates alerts for overdue debts', async () => {
      prisma.product.findMany.mockResolvedValue([])
      prisma.debtRecord.findMany.mockResolvedValue([
        { id: 'd1', contact: { name: 'Abdullayev' }, remainAmount: 1000000, isOverdue: true },
      ])
      prisma.salaryRecord.count.mockResolvedValue(0)
      prisma.contract.findMany.mockResolvedValue([])
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 })
      prisma.notification.createMany.mockResolvedValue({ count: 1 })

      const count = await service.refreshSmartNotifications('c1')
      expect(count).toBe(1)
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ category: 'debt', type: 'danger' }),
          ]),
        }),
      )
    })
  })

  describe('deleteOld', () => {
    it('deletes read notifications older than cutoff', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 3 })
      await service.deleteOld('c1', 30)
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'c1', isRead: true }),
        }),
      )
    })
  })
})
