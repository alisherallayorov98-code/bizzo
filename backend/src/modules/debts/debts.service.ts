import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

export interface CreateDebtDto {
  contactId:      string
  type:           'RECEIVABLE' | 'PAYABLE'
  amount:         number
  dueDate?:       string
  referenceId?:   string
  referenceType?: string
  notes?:         string
}

export interface AddPaymentDto {
  debtId:       string
  amount:       number
  paymentDate?: string
  notes?:       string
}

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // RO'YXAT
  // ============================================
  async findAll(companyId: string, query: {
    type?:      string
    isOverdue?: boolean | string
    contactId?: string
    search?:    string
    page?:      number
    limit?:     number
  }) {
    const { type, contactId, search, page = 1, limit = 30 } = query
    const isOverdue = query.isOverdue === 'true' || query.isOverdue === true
      ? true
      : query.isOverdue === 'false' || query.isOverdue === false
      ? false
      : undefined

    // Muddati o'tganlarni avtomatik yangilash
    await this.prisma.debtRecord.updateMany({
      where: {
        contact:      { companyId },
        remainAmount: { gt: 0 },
        dueDate:      { lt: new Date() },
        isOverdue:    false,
      },
      data: { isOverdue: true },
    })

    const where: Prisma.DebtRecordWhereInput = {
      contact:      { companyId },
      remainAmount: { gt: 0 },
      ...(type      && { type: type as any }),
      ...(isOverdue !== undefined && { isOverdue }),
      ...(contactId && { contactId }),
    }

    if (search) {
      where.contact = {
        companyId,
        name: { contains: search, mode: 'insensitive' },
      }
    }

    const [total, debts] = await Promise.all([
      this.prisma.debtRecord.count({ where }),
      this.prisma.debtRecord.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: [
          { isOverdue: 'desc' },
          { dueDate:   'asc'  },
        ],
        include: {
          contact: {
            select: { id: true, name: true, phone: true, type: true },
          },
        },
      }),
    ])

    return {
      success: true,
      data: {
        data: debts.map(d => ({
          ...d,
          amount:       Number(d.amount),
          paidAmount:   Number(d.paidAmount),
          remainAmount: Number(d.remainAmount),
        })),
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  // ============================================
  // YARATISH
  // ============================================
  async create(companyId: string, dto: CreateDebtDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, companyId, isActive: true },
    })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')

    const record = await this.prisma.debtRecord.create({
      data: {
        companyId,
        contactId:     dto.contactId,
        type:          dto.type as any,
        amount:        dto.amount,
        remainAmount:  dto.amount,
        paidAmount:    0,
        dueDate:       dto.dueDate ? new Date(dto.dueDate) : null,
        referenceId:   dto.referenceId,
        referenceType: dto.referenceType,
        notes:         dto.notes,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    })

    return {
      success: true,
      data: { ...record, amount: Number(record.amount), remainAmount: Number(record.remainAmount) },
    }
  }

  // ============================================
  // TO'LOV QO'SHISH
  // ============================================
  async addPayment(companyId: string, dto: AddPaymentDto) {
    const debt = await this.prisma.debtRecord.findFirst({
      where: { id: dto.debtId, contact: { companyId }, remainAmount: { gt: 0 } },
    })
    if (!debt) throw new NotFoundException('Qarz yozuvi topilmadi')

    const payAmount = Math.min(dto.amount, Number(debt.remainAmount))
    const newPaid   = Number(debt.paidAmount)   + payAmount
    const newRemain = Number(debt.remainAmount) - payAmount

    const updated = await this.prisma.debtRecord.update({
      where: { id: dto.debtId },
      data: {
        paidAmount:   newPaid,
        remainAmount: newRemain,
        isOverdue:    newRemain > 0 && debt.dueDate
          ? new Date(debt.dueDate) < new Date()
          : false,
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      data: { ...updated, paidAmount: Number(updated.paidAmount), remainAmount: Number(updated.remainAmount) },
    }
  }

  // ============================================
  // STATISTIKA
  // ============================================
  async getStats(companyId: string) {
    const now = new Date()

    const [receivable, payable, overdueReceivable, overduePayable, topDebts] = await Promise.all([
      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'RECEIVABLE', remainAmount: { gt: 0 } },
        _sum:   { remainAmount: true },
        _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'PAYABLE', remainAmount: { gt: 0 } },
        _sum:   { remainAmount: true },
        _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'RECEIVABLE', remainAmount: { gt: 0 }, dueDate: { lt: now } },
        _sum:   { remainAmount: true },
        _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'PAYABLE', remainAmount: { gt: 0 }, dueDate: { lt: now } },
        _sum:   { remainAmount: true },
        _count: true,
      }),
      this.prisma.debtRecord.findMany({
        where:   { contact: { companyId }, remainAmount: { gt: 0 } },
        orderBy: { remainAmount: 'desc' },
        take:    5,
        include: { contact: { select: { id: true, name: true, type: true } } },
      }),
    ])

    const stats = {
      receivable: {
        total:        Number(receivable._sum.remainAmount || 0),
        count:        receivable._count,
        overdue:      Number(overdueReceivable._sum.remainAmount || 0),
        overdueCount: overdueReceivable._count,
      },
      payable: {
        total:        Number(payable._sum.remainAmount || 0),
        count:        payable._count,
        overdue:      Number(overduePayable._sum.remainAmount || 0),
        overdueCount: overduePayable._count,
      },
      netBalance: Number(receivable._sum.remainAmount || 0) - Number(payable._sum.remainAmount || 0),
      topDebts:   topDebts.map(d => ({ ...d, amount: Number(d.amount), remainAmount: Number(d.remainAmount) })),
    }

    return stats
  }

  // ============================================
  // KONTAKT BO'YICHA
  // ============================================
  async getByContact(companyId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
    })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')

    const [receivable, payable] = await Promise.all([
      this.prisma.debtRecord.findMany({
        where:   { contactId, contact: { companyId }, type: 'RECEIVABLE' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.debtRecord.findMany({
        where:   { contactId, contact: { companyId }, type: 'PAYABLE' },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return { contact, receivable, payable }
  }
}
