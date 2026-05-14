import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { PrismaService }  from '../../prisma/prisma.service'
import { SmsService }     from '../integrations/sms/sms.service'
import { Prisma }         from '@prisma/client'

export interface CreateDebtDto {
  contactId:      string
  type:           'RECEIVABLE' | 'PAYABLE'
  amount:         number
  description?:   string
  dueDate?:       string
  referenceId?:   string
  referenceType?: string
  notes?:         string
}

export interface AddPaymentDto {
  debtId:       string
  amount:       number
  method?:      'CASH' | 'CARD' | 'TRANSFER' | 'AVANS' | 'OTHER'
  avansId?:     string
  paymentDate?: string
  notes?:       string
}

@Injectable()
export class DebtsService {
  constructor(
    private prisma: PrismaService,
    private sms:    SmsService,
  ) {}

  // в”Ђв”Ђв”Ђ Ro'yxat в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async findAll(companyId: string, query: {
    type?:      string
    isOverdue?: boolean | string
    contactId?: string
    search?:    string
    isPaid?:    string
    page?:      number
    limit?:     number
  }) {
    const { type, contactId, search, page = 1, limit = 50 } = query
    const isOverdue = query.isOverdue === 'true'  ? true
                    : query.isOverdue === 'false' ? false
                    : undefined
    const showPaid  = query.isPaid === 'true'

    // Muddati o'tganlarni avtomatik yangilash
    await this.prisma.debtRecord.updateMany({
      where: { companyId, isPaid: false, remaining: { gt: 0 }, dueDate: { lt: new Date() }, isOverdue: false },
      data:  { isOverdue: true },
    })

    const where: Prisma.DebtRecordWhereInput = {
      companyId,
      isPaid: showPaid ? true : false,
      ...(type       && { type: type as any }),
      ...(isOverdue  !== undefined && { isOverdue }),
      ...(contactId  && { contactId }),
      ...(search     && { contact: { name: { contains: search, mode: 'insensitive' } } }),
    }

    const [total, debts] = await Promise.all([
      this.prisma.debtRecord.count({ where }),
      this.prisma.debtRecord.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: [{ isOverdue: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          contact:  { select: { id: true, name: true, phone: true, type: true } },
          payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
          _count:   { select: { payments: true } },
        },
      }),
    ])

    return {
      success: true,
      data: {
        data: debts.map(d => this.mapDebt(d)),
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  // в”Ђв”Ђв”Ђ Bitta qarz (to'lov tarixi bilan) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async findOne(id: string, companyId: string) {
    const debt = await this.prisma.debtRecord.findFirst({
      where: { id, companyId },
      include: {
        contact:  { select: { id: true, name: true, phone: true, type: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    })
    if (!debt) throw new NotFoundException('Qarz yozuvi topilmadi')
    return { success: true, data: this.mapDebt(debt) }
  }

  // в”Ђв”Ђв”Ђ Yaratish в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async create(companyId: string, userId: string, dto: CreateDebtDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, companyId, isActive: true },
    })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')

    const record = await this.prisma.debtRecord.create({
      data: {
        companyId,
        contactId:     dto.contactId,
        createdById:   userId,
        type:          dto.type as any,
        description:   dto.description,
        amount:        dto.amount,
        remaining:     dto.amount,
        paidAmount:    0,
        dueDate:       dto.dueDate ? new Date(dto.dueDate) : null,
        referenceId:   dto.referenceId,
        referenceType: dto.referenceType,
        notes:         dto.notes,
      },
      include: { contact: { select: { id: true, name: true } } },
    })

    return { success: true, data: this.mapDebt(record) }
  }

  // в”Ђв”Ђв”Ђ O'chirish в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async remove(id: string, companyId: string) {
    const debt = await this.prisma.debtRecord.findFirst({
      where:   { id, companyId },
      include: { _count: { select: { payments: true } } },
    })
    if (!debt) throw new NotFoundException('Qarz yozuvi topilmadi')
    if ((debt as any)._count.payments > 0) {
      throw new BadRequestException('To\'lovlari mavjud qarzni o\'chirib bo\'lmaydi')
    }
    await this.prisma.debtRecord.delete({ where: { id } })
    return { success: true }
  }

  // в”Ђв”Ђв”Ђ To'lov qo'shish (to'liq atomic transaction) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async addPayment(companyId: string, userId: string, dto: AddPaymentDto) {
    const debt = await this.prisma.debtRecord.findFirst({
      where: { id: dto.debtId, companyId, isPaid: false },
    })
    if (!debt) throw new NotFoundException('Qarz yozuvi topilmadi yoki allaqachon to\'langan')

    const remaining = Number(debt.remaining)
    if (dto.amount <= 0) throw new BadRequestException('Summa 0 dan katta bo\'lishi kerak')
    if (dto.amount > remaining + 0.001) {
      throw new BadRequestException(`Maksimal to'lov: ${remaining.toLocaleString()} so'm`)
    }

    const method    = dto.method ?? 'CASH'
    const payAmount = Math.min(dto.amount, remaining) // float xatosidan himoya
    const newPaid   = Number(debt.paidAmount) + payAmount
    const newRemain = remaining - payAmount
    const isPaid    = newRemain < 0.01

    // Avans validatsiyasi (transaction ichida bajarish uchun ma'lumot olish)
    let avans: any = null
    if (method === 'AVANS') {
      if (!dto.avansId) throw new BadRequestException('Avans ID ko\'rsatilmagan')
      avans = await this.prisma.avansRecord.findFirst({
        where: { id: dto.avansId, companyId, isFullyUsed: false },
      })
      if (!avans) throw new NotFoundException('Avans topilmadi yoki to\'liq ishlatilgan')

      // Avans type в†” Debt type mosligini tekshirish
      // GIVEN avans в†’ faqat PAYABLE qarzga (biz yetkazuvchiga avans bergandik в†’ uning qarzini yopdik)
      // RECEIVED avans в†’ faqat RECEIVABLE qarzga (mijoz bizga avans bergandi в†’ uning qarzidan chiqamiz)
      const avansTypeOk =
        (avans.type === 'GIVEN'    && debt.type === 'PAYABLE')   ||
        (avans.type === 'RECEIVED' && debt.type === 'RECEIVABLE')
      if (!avansTypeOk) {
        throw new BadRequestException(
          avans.type === 'GIVEN'
            ? 'Berilgan avans faqat kreditor (PAYABLE) qarzga qo\'llanadi'
            : 'Olingan avans faqat debitor (RECEIVABLE) qarzga qo\'llanadi'
        )
      }

      const avansRemain = Number(avans.remaining)
      if (payAmount > avansRemain + 0.001) {
        throw new BadRequestException(`Avansda faqat ${avansRemain.toLocaleString()} so'm mavjud`)
      }
    }

    // Barcha o'zgarishlar bitta atomik transaksiyada
    await this.prisma.$transaction(async tx => {
      // 1. Qarzni yangilash
      await tx.debtRecord.update({
        where: { id: dto.debtId },
        data: {
          paidAmount: newPaid,
          remaining:  isPaid ? 0 : newRemain,
          isPaid,
          isOverdue:  !isPaid && debt.dueDate ? new Date(debt.dueDate) < new Date() : false,
        },
      })

      // 2. To'lov yozuvi
      await tx.debtPayment.create({
        data: {
          companyId,
          debtId:      dto.debtId,
          amount:      payAmount,
          method:      method as any,
          avansId:     dto.avansId ?? null,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          notes:       dto.notes ?? null,
          createdById: userId,
        },
      })

      // 3. Agar avans bo'lsa вЂ” avansni ham ayirish
      if (method === 'AVANS' && avans) {
        const avansRemain  = Number(avans.remaining)
        const newAvansUsed = Number(avans.usedAmount) + payAmount
        const newAvansRem  = avansRemain - payAmount

        await tx.avansRecord.update({
          where: { id: avans.id },
          data: {
            usedAmount:  newAvansUsed,
            remaining:   newAvansRem < 0.01 ? 0 : newAvansRem,
            isFullyUsed: newAvansRem < 0.01,
          },
        })
      }
    })

    return { success: true, isPaid, remaining: isPaid ? 0 : newRemain }
  }

  // в”Ђв”Ђв”Ђ Statistika в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async getStats(companyId: string) {
    const now = new Date()

    const [rec, pay, overdueRec, overduePay, avansGiven, avansReceived, recentPayments] = await Promise.all([
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'RECEIVABLE', isPaid: false },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'PAYABLE', isPaid: false },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'RECEIVABLE', isPaid: false, dueDate: { lt: now } },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'PAYABLE', isPaid: false, dueDate: { lt: now } },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'GIVEN', isFullyUsed: false },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'RECEIVED', isFullyUsed: false },
        _sum: { remaining: true }, _count: true,
      }),
      this.prisma.debtPayment.findMany({
        where:   { companyId },
        orderBy: { paymentDate: 'desc' },
        take:    5,
        include: { debt: { include: { contact: { select: { id: true, name: true } } } } },
      }),
    ])

    return {
      receivable:     { total: Number(rec._sum.remaining    || 0), count: rec._count,        overdue: Number(overdueRec._sum.remaining || 0), overdueCount: overdueRec._count },
      payable:        { total: Number(pay._sum.remaining    || 0), count: pay._count,        overdue: Number(overduePay._sum.remaining || 0), overdueCount: overduePay._count },
      avansGiven:     { total: Number(avansGiven._sum.remaining     || 0), count: avansGiven._count },
      avansReceived:  { total: Number(avansReceived._sum.remaining  || 0), count: avansReceived._count },
      netBalance:     Number(rec._sum.remaining || 0) - Number(pay._sum.remaining || 0),
      recentPayments: recentPayments.map(p => ({
        ...p,
        amount: Number(p.amount),
        debt: p.debt ? { ...p.debt, amount: Number(p.debt.amount), remaining: Number(p.debt.remaining) } : null,
      })),
    }
  }

  // в”Ђв”Ђв”Ђ Kontakt balansi в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async getContactBalance(companyId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, companyId } })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')

    const [debts, avans] = await Promise.all([
      this.prisma.debtRecord.findMany({
        where:   { contactId, companyId },
        orderBy: { createdAt: 'desc' },
        include: { payments: { orderBy: { paymentDate: 'desc' } } },
      }),
      this.prisma.avansRecord.findMany({
        where:   { contactId, companyId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const receivableTotal = debts.filter(d => d.type === 'RECEIVABLE' && !d.isPaid).reduce((s, d) => s + Number(d.remaining), 0)
    const payableTotal    = debts.filter(d => d.type === 'PAYABLE'    && !d.isPaid).reduce((s, d) => s + Number(d.remaining), 0)
    const avansGiven      = avans.filter(a => a.type === 'GIVEN'    && !a.isFullyUsed).reduce((s, a) => s + Number(a.remaining), 0)
    const avansReceived   = avans.filter(a => a.type === 'RECEIVED' && !a.isFullyUsed).reduce((s, a) => s + Number(a.remaining), 0)

    return {
      contact,
      summary: {
        receivable:    receivableTotal,
        payable:       payableTotal,
        avansGiven,
        avansReceived,
        netBalance:    receivableTotal - payableTotal,
      },
      debts: debts.map(d => this.mapDebt(d)),
      avans: avans.map(a => this.mapAvans(a)),
    }
  }

  // в”Ђв”Ђв”Ђ SMS eslatma в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  async sendReminder(companyId: string, debtId: string) {
    const debt = await this.prisma.debtRecord.findFirst({
      where:   { id: debtId, companyId, isPaid: false },
      include: { contact: { select: { name: true, phone: true } } },
    })
    if (!debt) throw new NotFoundException('Qarz yozuvi topilmadi')

    const phone = debt.contact.phone
    if (!phone) return { success: false, error: 'Kontaktda telefon raqami yo\'q' }

    const amount  = Number(debt.remaining).toLocaleString('uz-UZ')
    const duePart = debt.dueDate
      ? ` (muddat: ${new Date(debt.dueDate).toLocaleDateString('uz-UZ')})`
      : ''
    const message = `Hurmatli ${debt.contact.name}, sizning ${amount} so'm miqdoridagi qarzingiz${duePart} to'lanmagan. Iltimos to'lovni amalga oshiring.`

    const result = await this.sms.send(companyId, phone, message)
    return { success: result.success, error: result.error }
  }

  // в”Ђв”Ђв”Ђ Mapper в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  private mapDebt(d: any) {
    return {
      ...d,
      amount:      Number(d.amount),
      paidAmount:  Number(d.paidAmount),
      remaining:   Number(d.remaining),
      payments:    (d.payments ?? []).map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })),
      paymentCount: d._count?.payments ?? (d.payments?.length ?? 0),
    }
  }

  private mapAvans(a: any) {
    return {
      ...a,
      amount:     Number(a.amount),
      usedAmount: Number(a.usedAmount),
      remaining:  Number(a.remaining),
    }
  }
}

