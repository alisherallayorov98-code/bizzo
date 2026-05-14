import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateRecurringDto {
  type:        'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT'
  title:       string
  amount:      number
  currency?:   string
  notes?:      string
  category?:   string
  contactId?:  string
  frequency:   'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfMonth?: number
  dayOfWeek?:  number
  startsAt:    string
  endsAt?:     string
}

@Injectable()
export class RecurringService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateRecurringDto, userId: string) {
    if (dto.amount <= 0) {
      throw new BadRequestException("Summa noldan katta bo'lishi kerak")
    }
    const startsAt = new Date(dto.startsAt)
    const nextRunAt = this.computeNext(startsAt, dto.frequency, dto.dayOfMonth, dto.dayOfWeek)

    return this.prisma.recurringRule.create({
      data: {
        companyId,
        type:       dto.type,
        title:      dto.title,
        amount:     dto.amount,
        currency:   dto.currency ?? 'UZS',
        notes:      dto.notes,
        category:   dto.category,
        contactId:  dto.contactId,
        frequency:  dto.frequency,
        dayOfMonth: dto.dayOfMonth,
        dayOfWeek:  dto.dayOfWeek,
        startsAt,
        endsAt:     dto.endsAt ? new Date(dto.endsAt) : null,
        nextRunAt,
        createdById: userId,
      },
    })
  }

  async findAll(companyId: string) {
    return this.prisma.recurringRule.findMany({
      where:    { companyId },
      orderBy:  [{ isActive: 'desc' }, { nextRunAt: 'asc' }],
    })
  }

  // Yaqin 7 kun ichida ishga tushadigan qoidalar (Dashboard widget uchun)
  async getUpcoming(companyId: string, days = 7) {
    const now = new Date()
    const until = new Date(now)
    until.setDate(until.getDate() + days)

    return this.prisma.recurringRule.findMany({
      where: { companyId, isActive: true, nextRunAt: { lte: until } },
      orderBy: { nextRunAt: 'asc' },
      take: 5,
      select: {
        id: true, type: true, title: true, amount: true,
        frequency: true, nextRunAt: true,
      },
    })
  }

  async findOne(companyId: string, id: string) {
    const rule = await this.prisma.recurringRule.findFirst({
      where: { id, companyId },
    })
    if (!rule) throw new NotFoundException('Topilmadi')
    return rule
  }

  async update(companyId: string, id: string, dto: Partial<CreateRecurringDto>) {
    const existing = await this.findOne(companyId, id)
    const data: any = { ...dto }
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt)
    if (dto.endsAt)   data.endsAt   = new Date(dto.endsAt)
    if (dto.frequency || dto.dayOfMonth !== undefined || dto.dayOfWeek !== undefined) {
      data.nextRunAt = this.computeNext(
        existing.lastRunAt ?? existing.startsAt,
        dto.frequency ?? (existing.frequency as any),
        dto.dayOfMonth ?? existing.dayOfMonth ?? undefined,
        dto.dayOfWeek  ?? existing.dayOfWeek  ?? undefined,
      )
    }
    return this.prisma.recurringRule.update({ where: { id }, data })
  }

  async toggle(companyId: string, id: string) {
    const existing = await this.findOne(companyId, id)
    return this.prisma.recurringRule.update({
      where: { id },
      data:  { isActive: !existing.isActive },
    })
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id)
    await this.prisma.recurringRule.delete({ where: { id } })
    return { success: true }
  }

  // ============================================
  // CRON HELPER вЂ” keyingi run vaqtini hisoblash
  // ============================================
  computeNext(
    base: Date,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    dayOfMonth?: number | null,
    dayOfWeek?:  number | null,
  ): Date {
    const next = new Date(base.getTime())
    next.setHours(9, 0, 0, 0)

    if (frequency === 'DAILY') {
      next.setDate(next.getDate() + 1)
      return next
    }

    if (frequency === 'WEEKLY') {
      const targetDow = dayOfWeek ?? next.getDay()
      const today = next.getDay()
      const delta = ((targetDow - today + 7) % 7) || 7
      next.setDate(next.getDate() + delta)
      return next
    }

    // MONTHLY
    const day = dayOfMonth ?? next.getDate()
    next.setMonth(next.getMonth() + 1)
    // Yakshanba 31 fevral'ga qarsangiz oxirgi mavjud kun
    const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(day, lastDayOfMonth))
    return next
  }

  // ============================================
  // CRON PROCESSOR вЂ” tushgan qoidalarni bajarish
  // ============================================
  async processDueRules(now: Date = new Date()) {
    const due = await this.prisma.recurringRule.findMany({
      where: {
        isActive:  true,
        nextRunAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
      },
    })

    let processed = 0
    for (const rule of due) {
      try {
        // Type bo'yicha mos yozuv yaratish
        if (rule.type === 'EXPENSE' || rule.type === 'INCOME') {
          // Shunchaki notification yaratamiz вЂ” ish stajlash uchun
          await this.prisma.notification.create({
            data: {
              companyId: rule.companyId,
              title:     `Takroriy ${rule.type === 'EXPENSE' ? 'xarajat' : 'daromad'}: ${rule.title}`,
              message:   `${Number(rule.amount).toLocaleString('uz-UZ')} ${rule.currency} вЂ” tasdiqlash kerak`,
              type:      'info',
              category:  'recurring',
              link:      '/recurring',
            },
          }).catch(() => {})
        } else if (rule.type === 'DEBT_PAYMENT' && rule.contactId) {
          // Avto qarz yozuvi
          await this.prisma.debtRecord.create({
            data: {
              companyId:    rule.companyId,
              contactId:    rule.contactId,
              type:         'PAYABLE' as any,
              amount:       rule.amount,
              paidAmount:   0,
              remaining: rule.amount,
              currency:     rule.currency ?? 'UZS',
              dueDate:      now,
              notes:        `Takroriy: ${rule.title}`,
              referenceType: 'RECURRING',
              referenceId:   rule.id,
            },
          }).catch(() => {})
        }

        const nextRunAt = this.computeNext(now, rule.frequency as any, rule.dayOfMonth, rule.dayOfWeek)
        await this.prisma.recurringRule.update({
          where: { id: rule.id },
          data:  {
            lastRunAt: now,
            nextRunAt,
            runCount:  { increment: 1 },
            isActive:  rule.endsAt && nextRunAt > rule.endsAt ? false : true,
          },
        })
        processed++
      } catch {
        // continue
      }
    }
    return { processed }
  }
}

