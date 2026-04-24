import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from './notifications.service'
import { SmsService } from '../integrations/sms/sms.service'
import { TelegramService } from '../integrations/telegram/telegram.service'

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
    private readonly telegram: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyChecks() {
    this.logger.log('Kunlik bildirishnoma tekshiruvi boshlandi')

    const companies = await this.prisma.company.findMany({
      where:  { isActive: true },
      select: { id: true },
    })

    let total = 0
    for (const { id: companyId } of companies) {
      try {
        const count = await this.notifications.refreshSmartNotifications(companyId)
        total += count
        await this.checkOverdueDebts(companyId)
      } catch (e: any) {
        this.logger.error(`companyId=${companyId} xatolik: ${e.message}`)
      }
    }

    this.logger.log(`Kunlik tekshiruv tugadi. Jami ${total} ta bildirishnoma yaratildi`)
  }

  private async checkOverdueDebts(companyId: string) {
    const overdueDebts = await this.prisma.debtRecord.findMany({
      where: {
        contact:      { companyId },
        type:         'RECEIVABLE',
        remainAmount: { gt: 0 },
        dueDate:      { lt: new Date() },
      },
      include: {
        contact: { select: { name: true, phone: true } },
      },
      take: 50,
    })

    if (!overdueDebts.length) return

    // SMS yuborish: telefon raqami bor har bir qarzdorga
    for (const debt of overdueDebts) {
      const phone = debt.contact.phone
      if (!phone) continue

      const daysOverdue = Math.floor(
        (Date.now() - new Date(debt.dueDate!).getTime()) / (1000 * 60 * 60 * 24),
      )
      const amount = Number(debt.remainAmount).toLocaleString('uz-UZ')
      const message =
        `Hurmatli ${debt.contact.name}, sizning ${amount} so'm miqdoridagi qarzingizning muddati ${daysOverdue} kun oldin tugagan. Iltimos, to'lovni amalga oshiring.`

      try {
        await this.sms.send(companyId, phone, message)
      } catch (e: any) {
        this.logger.warn(`SMS yuborishda xatolik (${phone}): ${e.message}`)
      }
    }

    // Telegram bildirishnoma: admin kanaliga
    const telegramDebts = overdueDebts.map(d => ({
      contactName: d.contact.name,
      amount:      Number(d.remainAmount),
      currency:    'UZS',
      daysOverdue: Math.floor(
        (Date.now() - new Date(d.dueDate!).getTime()) / (1000 * 60 * 60 * 24),
      ),
    }))

    try {
      await this.telegram.notifyDebtOverdue(companyId, telegramDebts)
    } catch (e: any) {
      this.logger.warn(`Telegram bildirishnomada xatolik: ${e.message}`)
    }
  }
}
