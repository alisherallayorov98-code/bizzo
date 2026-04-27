import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export const EXPENSE_CATEGORIES = [
  'DELIVERY',       // Yetkazib berish (haydovchi to'lovi)
  'TRANSPORT',      // Transport (yoqilg'i, ta'mir)
  'UTILITY',        // Kommunal (svet, gaz, suv, internet)
  'SUPPLIES',       // Kichik xaridlar (oziq-ovqat, kantselyariya)
  'SALARY_ADVANCE', // Avans (xodimga vaqtinchalik)
  'OTHER',          // Boshqa
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export interface CreateCashExpenseDto {
  category:    ExpenseCategory | string
  amount:      number
  currency?:   string
  driverId?:   string
  payeeName:   string  // majburiy
  payeePhone?: string
  notes:       string  // majburiy
  receiptUrl?: string
  contactId?:  string
  warehouseId?: string
  expenseDate?: string
}

export interface QueryCashExpenseDto {
  from?:      string
  to?:        string
  category?:  string
  driverId?:  string
  search?:    string
  page?:      number
  limit?:     number
}

@Injectable()
export class CashExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // YARATISH
  // ============================================
  async create(companyId: string, dto: CreateCashExpenseDto, userId: string) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException("Summa noldan katta bo'lishi kerak")
    }
    if (!dto.payeeName?.trim()) {
      throw new BadRequestException("Qabul qiluvchi ismini ko'rsating")
    }
    if (!dto.notes?.trim()) {
      throw new BadRequestException("Izoh majburiy — nima uchun chiqim qilinayotgani yozilishi kerak")
    }

    // Agar driverId berilsa, mavjudligini tekshirish
    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: dto.driverId, companyId, isActive: true },
      })
      if (!driver) throw new NotFoundException('Haydovchi topilmadi')
    }

    return this.prisma.$transaction(async tx => {
      const expense = await tx.cashExpense.create({
        data: {
          companyId,
          category:    dto.category,
          amount:      dto.amount,
          currency:    dto.currency ?? 'UZS',
          driverId:    dto.driverId ?? null,
          payeeName:   dto.payeeName.trim(),
          payeePhone:  dto.payeePhone?.trim(),
          notes:       dto.notes.trim(),
          receiptUrl:  dto.receiptUrl,
          contactId:   dto.contactId,
          warehouseId: dto.warehouseId,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          createdById: userId,
        },
        include: {
          driver: { select: { id: true, name: true, phone: true, isPermanent: true } },
        },
      })

      // Haydovchi statistikasini yangilash
      if (dto.driverId) {
        await tx.driver.update({
          where: { id: dto.driverId },
          data:  {
            totalPaid:  { increment: dto.amount },
            payCount:   { increment: 1 },
            lastPaidAt: new Date(),
          },
        })
      }

      return {
        ...expense,
        amount: Number(expense.amount),
      }
    })
  }

  // ============================================
  // RO'YXAT
  // ============================================
  async findAll(companyId: string, query: QueryCashExpenseDto) {
    const page  = Math.max(1, Number(query.page  ?? 1))
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)))

    const where: any = { companyId }
    if (query.category) where.category = query.category
    if (query.driverId) where.driverId = query.driverId
    if (query.from || query.to) {
      where.expenseDate = {}
      if (query.from) where.expenseDate.gte = new Date(query.from)
      if (query.to) {
        const t = new Date(query.to)
        t.setHours(23, 59, 59, 999)
        where.expenseDate.lte = t
      }
    }
    if (query.search) {
      where.OR = [
        { payeeName: { contains: query.search, mode: 'insensitive' } },
        { notes:     { contains: query.search, mode: 'insensitive' } },
        { driver:    { name: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const [items, total, agg] = await Promise.all([
      this.prisma.cashExpense.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          driver: { select: { id: true, name: true, phone: true, isPermanent: true } },
        },
      }),
      this.prisma.cashExpense.count({ where }),
      this.prisma.cashExpense.aggregate({ where, _sum: { amount: true } }),
    ])

    return {
      data: items.map(i => ({ ...i, amount: Number(i.amount) })),
      meta: {
        total, page, limit,
        totalPages:  Math.ceil(total / limit),
        totalAmount: Number(agg._sum.amount ?? 0),
      },
    }
  }

  // ============================================
  // BITTA
  // ============================================
  async findOne(companyId: string, id: string) {
    const item = await this.prisma.cashExpense.findFirst({
      where:   { id, companyId },
      include: {
        driver: { select: { id: true, name: true, phone: true, isPermanent: true } },
      },
    })
    if (!item) throw new NotFoundException('Topilmadi')
    return { ...item, amount: Number(item.amount) }
  }

  // ============================================
  // YANGILASH
  // ============================================
  async update(companyId: string, id: string, dto: Partial<CreateCashExpenseDto>) {
    const existing = await this.findOne(companyId, id)

    if (dto.notes !== undefined && !dto.notes?.trim()) {
      throw new BadRequestException('Izoh bo\'sh bo\'la olmaydi')
    }

    return this.prisma.$transaction(async tx => {
      const updated = await tx.cashExpense.update({
        where: { id },
        data: {
          ...(dto.category    !== undefined && { category:    dto.category }),
          ...(dto.amount      !== undefined && { amount:      dto.amount }),
          ...(dto.currency    !== undefined && { currency:    dto.currency }),
          ...(dto.driverId    !== undefined && { driverId:    dto.driverId || null }),
          ...(dto.payeeName   !== undefined && { payeeName:   dto.payeeName.trim() }),
          ...(dto.payeePhone  !== undefined && { payeePhone:  dto.payeePhone?.trim() }),
          ...(dto.notes       !== undefined && { notes:       dto.notes!.trim() }),
          ...(dto.receiptUrl  !== undefined && { receiptUrl:  dto.receiptUrl }),
          ...(dto.expenseDate !== undefined && { expenseDate: new Date(dto.expenseDate) }),
        },
        include: {
          driver: { select: { id: true, name: true, phone: true, isPermanent: true } },
        },
      })

      // Agar haydovchi yoki summa o'zgargan bo'lsa, statni qayta hisoblash
      if (dto.driverId !== undefined || dto.amount !== undefined) {
        if (existing.driverId && existing.driverId !== updated.driverId) {
          // Eski haydovchidan ayirish
          await tx.driver.update({
            where: { id: existing.driverId },
            data:  {
              totalPaid: { decrement: existing.amount },
              payCount:  { decrement: 1 },
            },
          }).catch(() => {})
        }
        if (updated.driverId) {
          // Yangi haydovchining statini qayta hisoblash
          const allExpenses = await tx.cashExpense.aggregate({
            where: { driverId: updated.driverId },
            _sum:  { amount: true },
            _count: true,
          })
          await tx.driver.update({
            where: { id: updated.driverId },
            data:  {
              totalPaid: Number(allExpenses._sum.amount ?? 0),
              payCount:  allExpenses._count,
            },
          })
        }
      }

      return { ...updated, amount: Number(updated.amount) }
    })
  }

  // ============================================
  // O'CHIRISH
  // ============================================
  async remove(companyId: string, id: string) {
    const existing = await this.findOne(companyId, id)
    return this.prisma.$transaction(async tx => {
      await tx.cashExpense.delete({ where: { id } })
      if (existing.driverId) {
        await tx.driver.update({
          where: { id: existing.driverId },
          data:  {
            totalPaid: { decrement: existing.amount },
            payCount:  { decrement: 1 },
          },
        }).catch(() => {})
      }
      return { success: true }
    })
  }

  // ============================================
  // STATISTIKA — kategoriya/haydovchi bo'yicha
  // ============================================
  async getStats(companyId: string, query: { from?: string; to?: string }) {
    const where: any = { companyId }
    if (query.from || query.to) {
      where.expenseDate = {}
      if (query.from) where.expenseDate.gte = new Date(query.from)
      if (query.to) {
        const t = new Date(query.to)
        t.setHours(23, 59, 59, 999)
        where.expenseDate.lte = t
      }
    }

    const [byCategory, byDriver, total, dailyAvg] = await Promise.all([
      this.prisma.cashExpense.groupBy({
        by:    ['category'],
        where,
        _sum:  { amount: true },
        _count: true,
      }),
      this.prisma.cashExpense.groupBy({
        by:    ['driverId'],
        where: { ...where, driverId: { not: null } },
        _sum:  { amount: true },
        _count: true,
      }),
      this.prisma.cashExpense.aggregate({
        where,
        _sum:  { amount: true },
        _count: true,
      }),
      this.computeDailyAverage(companyId, query),
    ])

    // Driver nomlarini topish
    const driverIds = byDriver.map(d => d.driverId).filter(Boolean) as string[]
    const drivers = driverIds.length > 0
      ? await this.prisma.driver.findMany({
          where:  { id: { in: driverIds } },
          select: { id: true, name: true, phone: true, isPermanent: true },
        })
      : []
    const driverMap = new Map(drivers.map(d => [d.id, d]))

    return {
      total: {
        amount: Number(total._sum.amount ?? 0),
        count:  total._count,
      },
      byCategory: byCategory.map(c => ({
        category: c.category,
        amount:   Number(c._sum.amount ?? 0),
        count:    c._count,
      })).sort((a, b) => b.amount - a.amount),
      byDriver: byDriver.map(d => ({
        driver: driverMap.get(d.driverId!) ?? null,
        amount: Number(d._sum.amount ?? 0),
        count:  d._count,
      })).sort((a, b) => b.amount - a.amount),
      dailyAvg,
    }
  }

  private async computeDailyAverage(companyId: string, query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d
    })()
    const to = query.to ? new Date(query.to) : new Date()
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)))
    const agg = await this.prisma.cashExpense.aggregate({
      where: { companyId, expenseDate: { gte: from, lte: to } },
      _sum:  { amount: true },
    })
    return Math.round(Number(agg._sum.amount ?? 0) / days)
  }
}
