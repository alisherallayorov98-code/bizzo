import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { ProductsService } from '../../src/modules/products/products.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock'

describe('ProductsService', () => {
  let service: ProductsService
  let prisma: PrismaMock

  beforeEach(async () => {
    prisma = createPrismaMock()
    prisma.stockItem = { findMany: jest.fn().mockResolvedValue([]) } as any
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(ProductsService)
  })

  describe('create', () => {
    it('creates product with defaults', async () => {
      prisma.product.create.mockResolvedValue({ id: 'p1', name: 'Beton' })
      const res = await service.create('c1', { name: 'Beton' } as any, 'u1')
      expect(res.id).toBe('p1')
      const arg = prisma.product.create.mock.calls[0][0]
      expect(arg.data.unit).toBe('dona')
      expect(arg.data.isService).toBe(false)
    })

    it('throws ConflictException on duplicate code', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'ex', name: 'Exist' })
      await expect(service.create('c1', { name: 'X', code: 'ABC' } as any, 'u1'))
        .rejects.toThrow(ConflictException)
    })
  })

  describe('findAll', () => {
    it('returns paginated list', async () => {
      prisma.product.count.mockResolvedValue(1)
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'X', buyPrice: 100, stockItems: [] },
      ])
      const res = await service.findAll('c1', { page: 1, limit: 10 } as any)
      expect(res.data).toHaveLength(1)
      expect((res as any).meta.total).toBe(1)
    })

    it('applies category filter', async () => {
      prisma.product.count.mockResolvedValue(0)
      prisma.product.findMany.mockResolvedValue([])
      await service.findAll('c1', { category: 'Qurilish' } as any)
      const args = prisma.product.findMany.mock.calls[0][0]
      expect(args.where.category).toBe('Qurilish')
    })

    it('applies search across name/code/barcode', async () => {
      prisma.product.count.mockResolvedValue(0)
      prisma.product.findMany.mockResolvedValue([])
      await service.findAll('c1', { search: 'bet' } as any)
      const args = prisma.product.findMany.mock.calls[0][0]
      expect(args.where.OR).toBeDefined()
    })
  })

  describe('findOne', () => {
    it('returns product when found', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', stockItems: [] })
      const res = await service.findOne('c1', 'p1')
      expect(res.id).toBe('p1')
    })

    it('throws NotFoundException when missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null)
      await expect(service.findOne('c1', 'nope')).rejects.toThrow(NotFoundException)
    })
  })
})
