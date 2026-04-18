import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { ContactsService } from '../../src/modules/contacts/contacts.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('ContactsService', () => {
  let service: ContactsService
  let prisma: PrismaMock

  beforeEach(async () => {
    prisma = createPrismaMock()
    prisma.debtRecord = { groupBy: jest.fn().mockResolvedValue([]), findFirst: jest.fn() } as any

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(ContactsService)
  })

  describe('create', () => {
    it('creates contact without STIR', async () => {
      prisma.contact.create.mockResolvedValue({ id: 'k1', name: 'ACME' })
      const res = await service.create('c1', { name: 'ACME', type: 'CUSTOMER' } as any, 'u1')
      expect(res.id).toBe('k1')
      expect(prisma.contact.create).toHaveBeenCalled()
    })

    it('throws ConflictException on duplicate STIR', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'exist', name: 'Other' })
      await expect(service.create('c1', { name: 'X', stir: '123' } as any, 'u1'))
        .rejects.toThrow(ConflictException)
    })
  })

  describe('findAll', () => {
    it('returns paginated list', async () => {
      prisma.contact.findMany.mockResolvedValue([{ id: '1', debtRecords: [] }])
      prisma.contact.count.mockResolvedValue(1)
      const res = await service.findAll('c1', {} as any)
      expect(res).toBeDefined()
      expect(prisma.contact.findMany).toHaveBeenCalled()
    })

    it('applies type filter', async () => {
      prisma.contact.findMany.mockResolvedValue([])
      prisma.contact.count.mockResolvedValue(0)
      await service.findAll('c1', { type: 'CUSTOMER' } as any)
      const args = prisma.contact.findMany.mock.calls[0][0]
      expect(args.where.type).toBe('CUSTOMER')
    })
  })

  describe('findOne', () => {
    it('returns contact with debtStats', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'k1', debtRecords: [] })
      const res = await service.findOne('c1', 'k1')
      expect(res.id).toBe('k1')
      expect(res).toHaveProperty('debtStats')
    })

    it('throws NotFoundException when missing', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)
      await expect(service.findOne('c1', 'nope')).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('updates contact', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'k1', debtRecords: [] })
      prisma.contact.update.mockResolvedValue({ id: 'k1', name: 'Updated' })
      const res = await service.update('c1', 'k1', { name: 'Updated' })
      expect(res.name).toBe('Updated')
    })
  })

  describe('remove', () => {
    it('soft deletes when no active debt', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'k1', debtRecords: [] })
      ;(prisma as any).debtRecord.findFirst.mockResolvedValue(null)
      prisma.contact.update.mockResolvedValue({ id: 'k1', isActive: false })
      const res = await service.remove('c1', 'k1')
      expect(prisma.contact.update).toHaveBeenCalled()
      expect(res).toBeDefined()
    })

    it('throws ConflictException when active debt exists', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'k1', debtRecords: [] })
      ;(prisma as any).debtRecord.findFirst.mockResolvedValue({ id: 'd1' })
      await expect(service.remove('c1', 'k1')).rejects.toThrow(ConflictException)
    })
  })
})
