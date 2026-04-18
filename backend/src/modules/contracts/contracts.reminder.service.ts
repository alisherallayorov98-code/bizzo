import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Har kuni 09:00 da muddati 7, 3, 1 kun qolgan shartnomalar bo'yicha eslatma.
 */
@Injectable()
export class ContractReminderService {
  private readonly logger = new Logger(ContractReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailyCheck() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const days of [7, 3, 1]) {
      const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const end = new Date(target.getTime() + 24 * 60 * 60 * 1000);

      const contracts = await this.prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: target, lt: end },
        },
      });

      for (const c of contracts) {
        const owner = await this.prisma.user.findFirst({
          where: { companyId: c.companyId, role: 'ADMIN' },
        });
        if (!owner?.email) continue;

        await this.email.sendDebtReminderEmail({
          to: owner.email,
          debtorName: owner.firstName || owner.email,
          companyName: 'BIZZO',
          amount: `Shartnoma #${c.contractNumber}`,
          overdueDays: -days,
          dueDate: c.endDate?.toISOString().slice(0, 10),
          companyId: c.companyId,
        });

        await this.prisma.contractReminder.create({
          data: {
            contractId: c.id,
            reminderDate: new Date(),
            message: `Shartnoma muddati ${days} kunda tugaydi`,
            isSent: true,
            sentAt: new Date(),
          },
        });

        this.logger.log(`Reminder sent: ${c.contractNumber} (${days}d)`);
      }
    }
  }
}
