import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService }        from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class DebtsCronService {
  private readonly logger = new Logger(DebtsCronService.name)

  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
  ) {}

  // Har kuni soat 09:00 — muddati o'tgan qarzlarni belgilash + notification
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueDebts() {
    const companies = await this.prisma.company.findMany({
      where:  { isActive: true },
      select: { id: true },
    })

    for (const { id: companyId } of companies) {
      try {
        const overdue = await this.prisma.debtRecord.findMany({
          where: {
            companyId,
            remainAmount: { gt: 0 },
            dueDate:      { lt: new Date() },
            isOverdue:    false,
          },
          select: { id: true, remainAmount: true },
        })

        if (!overdue.length) continue

        await this.prisma.debtRecord.updateMany({
          where: { id: { in: overdue.map(d => d.id) } },
          data:  { isOverdue: true },
        })

        const total = overdue.reduce((s, d) => s + Number(d.remainAmount), 0)

        await this.notifications.create({
          companyId,
          title:    `${overdue.length} ta qarz muddati o'tdi`,
          message:  `Jami: ${total.toLocaleString('uz-UZ')} so'm — tezkor choralar ko'ring`,
          type:     'danger',
          category: 'debt',
          link:     '/debts?overdue=true',
        }).catch(() => {})
      } catch (err) {
        this.logger.error(`Debt overdue check failed for company ${companyId}`, err)
      }
    }

    this.logger.log('Debt overdue check completed')
  }
}
