import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

export interface CreateAvansDto {
  contactId:   string
  type:        'GIVEN' | 'RECEIVED'
  amount:      number
  description: string
  notes?:      string
  currency?:   string
}

@Injectable()
export class AvansService {
  constructor(private prisma: PrismaService) {}

  // ─── Ro'yxat ─────────────────────────────────────────────────────────────

  async findAll(companyId: string, query: {
    type?:        string
    contactId?:   string
    isFullyUsed?: string
    search?:      string
    page?:        number
    limit?:       number
  }) {
    const { type, contactId, search, page = 1, limit = 50 } = query
    const isFullyUsed = query.isFullyUsed === 'true'  ? true
                      : query.isFullyUsed === 'false' ? false
                      : false // default: faqat aktiv avanslar

    const where: Prisma.AvansRecordWhereInput = {
      companyId,
      isFullyUsed,
      ...(type      && { type: type as any }),
      ...(contactId && { contactId }),
      ...(search    && { contact: { name: { contains: search, mode: 'insensitive' } } }),
    }

    const [total, avans] = await Promise.all([
      this.prisma.avansRecord.count({ where }),
      this.prisma.avansRecord.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { id: true, name: true, phone: true, type: true } } },
      }),
    ])

    return {
      success: true,
      data: {
        data: avans.map(a => this.map(a)),
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  // ─── Yaratish ─────────────────────────────────────────────────────────────

  async create(companyId: string, userId: string, dto: CreateAvansDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, companyId, isActive: true },
    })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')
    if (dto.amount <= 0) throw new BadRequestException('Summa 0 dan katta bo\'lishi kerak')

    const record = await this.prisma.avansRecord.create({
      data: {
        companyId,
        contactId:   dto.contactId,
        createdById: userId,
        type:        dto.type as any,
        description: dto.description,
        amount:      dto.amount,
        remaining:   dto.amount,
        usedAmount:  0,
        currency:    dto.currency ?? 'UZS',
        notes:       dto.notes,
      },
      include: { contact: { select: { id: true, name: true } } },
    })

    return { success: true, data: this.map(record) }
  }

  // ─── O'chirish (faqat ishlatilmagan) ─────────────────────────────────────

  async remove(id: string, companyId: string) {
    const avans = await this.prisma.avansRecord.findFirst({ where: { id, companyId } })
    if (!avans) throw new NotFoundException('Avans topilmadi')
    if (Number(avans.usedAmount) > 0) {
      throw new BadRequestException('Qisman ishlatilgan avansni o\'chirib bo\'lmaydi')
    }
    await this.prisma.avansRecord.delete({ where: { id } })
    return { success: true }
  }

  // ─── Avansni qarzga qo'llash ──────────────────────────────────────────────

  async applyToDebt(companyId: string, userId: string, avansId: string, debtId: string, amount: number) {
    const [avans, debt] = await Promise.all([
      this.prisma.avansRecord.findFirst({ where: { id: avansId, companyId, isFullyUsed: false } }),
      this.prisma.debtRecord.findFirst({ where: { id: debtId, companyId, isPaid: false } }),
    ])

    if (!avans) throw new NotFoundException('Avans topilmadi')
    if (!debt)  throw new NotFoundException('Qarz topilmadi')

    const avansRemain = Number(avans.remaining)
    const debtRemain  = Number(debt.remaining)

    if (amount <= 0) throw new BadRequestException('Summa 0 dan katta bo\'lishi kerak')
    if (amount > avansRemain + 0.001) throw new BadRequestException(`Avansda faqat ${avansRemain.toLocaleString()} so'm mavjud`)
    if (amount > debtRemain  + 0.001) throw new BadRequestException(`Qarz qoldig'i faqat ${debtRemain.toLocaleString()} so'm`)

    // Avans type ↔ Qarz type mos kelishini tekshirish
    const typeOk =
      (avans.type === 'GIVEN'    && debt.type === 'PAYABLE')   ||
      (avans.type === 'RECEIVED' && debt.type === 'RECEIVABLE')
    if (!typeOk) {
      throw new BadRequestException(
        avans.type === 'GIVEN'
          ? 'Berilgan avans faqat kreditor (PAYABLE) qarzga qo\'llanadi'
          : 'Olingan avans faqat debitor (RECEIVABLE) qarzga qo\'llanadi'
      )
    }

    const applyAmount    = Math.min(amount, avansRemain, debtRemain)
    const newAvansRemain = avansRemain - applyAmount
    const newDebtRemain  = debtRemain  - applyAmount

    await this.prisma.$transaction([
      this.prisma.avansRecord.update({
        where: { id: avansId },
        data: {
          usedAmount:  { increment: applyAmount },
          remaining:   newAvansRemain < 0.01 ? 0 : newAvansRemain,
          isFullyUsed: newAvansRemain < 0.01,
        },
      }),
      this.prisma.debtRecord.update({
        where: { id: debtId },
        data: {
          paidAmount: { increment: applyAmount },
          remaining:  newDebtRemain < 0.01 ? 0 : newDebtRemain,
          isPaid:     newDebtRemain < 0.01,
        },
      }),
      this.prisma.debtPayment.create({
        data: {
          companyId,
          debtId,
          amount:      applyAmount,
          method:      'AVANS',
          avansId,
          createdById: userId,
          notes:       `Avans (#${avansId.slice(-6)}) dan qo'llanildi`,
        },
      }),
    ])

    return {
      success:        true,
      applied:        applyAmount,
      avansRemaining: newAvansRemain < 0.01 ? 0 : newAvansRemain,
      debtRemaining:  newDebtRemain  < 0.01 ? 0 : newDebtRemain,
    }
  }

  // ─── Kontakt bo'yicha aktiv avanslar ──────────────────────────────────────

  async getByContact(companyId: string, contactId: string) {
    const avans = await this.prisma.avansRecord.findMany({
      where:   { contactId, companyId, isFullyUsed: false },
      orderBy: { createdAt: 'desc' },
    })
    return avans.map(a => this.map(a))
  }

  // ─── Statistika ───────────────────────────────────────────────────────────

  async getStats(companyId: string) {
    const [given, received] = await Promise.all([
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'GIVEN', isFullyUsed: false },
        _sum: { remaining: true, amount: true }, _count: true,
      }),
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'RECEIVED', isFullyUsed: false },
        _sum: { remaining: true, amount: true }, _count: true,
      }),
    ])

    return {
      given:    { total: Number(given._sum.remaining  || 0), count: given._count },
      received: { total: Number(received._sum.remaining || 0), count: received._count },
    }
  }

  private map(a: any) {
    return {
      ...a,
      amount:     Number(a.amount),
      usedAmount: Number(a.usedAmount),
      remaining:  Number(a.remaining),
    }
  }
}
