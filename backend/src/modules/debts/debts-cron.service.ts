import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService }        from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { TelegramService }      from '../integrations/telegram/telegram.service'

@Injectable()
export class DebtsCronService {
  private readonly logger = new Logger(DebtsCronService.name)

  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
    private readonly telegram:       TelegramService,
  ) {}

  // Har kuni soat 09:00 — yangi muddati o'tganlarni belgilash + ogohlantirish
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueDebts() {
    const companies = await this.prisma.company.findMany({
      where:  { isActive: true },
      select: { id: true },
    })

    for (const { id: companyId } of companies) {
      try {
        // Yangi muddati o'tgan qarzlar
        const newOverdue = await this.prisma.debtRecord.findMany({
          where: {
            companyId,
            remainAmount: { gt: 0 },
            dueDate:      { lt: new Date() },
            isOverdue:    false,
          },
          select: { id: true, remainAmount: true },
        })

        if (newOverdue.length > 0) {
          await this.prisma.debtRecord.updateMany({
            where: { id: { in: newOverdue.map(d => d.id) } },
            data:  { isOverdue: true },
          })

          const total = newOverdue.reduce((s, d) => s + Number(d.remainAmount), 0)
          await this.notifications.create({
            companyId,
            title:    `${newOverdue.length} ta qarz muddati o'tdi`,
            message:  `Jami: ${total.toLocaleString('uz-UZ')} so'm — tezkor choralar ko'ring`,
            type:     'danger',
            category: 'debt',
            link:     '/debts?overdue=true',
          }).catch(() => {})
        }

        // Telegramga: barcha aktiv muddati o'tgan qarzlar (eng katta 10 ta)
        const allOverdue = await this.prisma.debtRecord.findMany({
          where: { companyId, remainAmount: { gt: 0 }, isOverdue: true },
          orderBy: { remainAmount: 'desc' },
          take: 10,
          include: {
            contact: { select: { name: true } },
          },
        })

        if (allOverdue.length > 0) {
          const now = Date.now()
          try {
            await this.telegram.notifyDebtOverdue(companyId, allOverdue.map(d => ({
              contactName: d.contact?.name ?? 'Noma\'lum',
              amount:      Number(d.remainAmount),
              currency:    d.currency ?? 'UZS',
              daysOverdue: d.dueDate
                ? Math.max(0, Math.floor((now - d.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
                : 0,
            })))
          } catch (e: any) {
            this.logger.warn(
              `Telegram debt notification failed for company ${companyId}: ${e?.message ?? e}`,
            )
          }
        }
      } catch (err) {
        this.logger.error(`Debt overdue check failed for company ${companyId}`, err)
      }
    }

    this.logger.log('Debt overdue check completed')
  }

  // Har dushanba soat 09:30 — haftalik qarz xulosasi (TG)
  @Cron('0 30 9 * * MON')
  async weeklyDebtSummary() {
    const companies = await this.prisma.company.findMany({
      where:  { isActive: true },
      select: { id: true },
    })

    for (const { id: companyId } of companies) {
      try {
        const debts = await this.prisma.debtRecord.aggregate({
          where: { companyId, remainAmount: { gt: 0 } },
          _sum:   { remainAmount: true },
          _count: true,
        })
        const overdue = await this.prisma.debtRecord.aggregate({
          where: { companyId, remainAmount: { gt: 0 }, isOverdue: true },
          _sum:   { remainAmount: true },
          _count: true,
        })

        const cfg = await this.prisma.integrationConfig.findUnique({
          where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
        })
        if (!cfg?.isActive) continue
        const { notifyChannelId } = cfg.config as any
        if (!notifyChannelId) continue

        const text = [
          '<b>📊 Haftalik qarz xulosasi</b>',
          ``,
          `Jami faol qarzlar: <b>${debts._count}</b> ta`,
          `Umumiy summa: <b>${Number(debts._sum.remainAmount ?? 0).toLocaleString('uz-UZ')}</b> so'm`,
          ``,
          `Muddati o'tgan: <b>${overdue._count}</b> ta`,
          `Summa: <b>${Number(overdue._sum.remainAmount ?? 0).toLocaleString('uz-UZ')}</b> so'm`,
        ].join('\n')

        try {
          await this.telegram.sendMessage(companyId, notifyChannelId, text)
        } catch (e: any) {
          this.logger.warn(`Weekly debt summary send failed for ${companyId}: ${e?.message ?? e}`)
        }
      } catch (err) {
        this.logger.error(`Weekly debt summary failed for ${companyId}`, err)
      }
    }
  }
}
