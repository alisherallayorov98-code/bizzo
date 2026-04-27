import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { RecurringService } from './recurring.service'

@Injectable()
export class RecurringCronService {
  private readonly logger = new Logger(RecurringCronService.name)

  constructor(private readonly service: RecurringService) {}

  // Har soatda — agar bugun nextRunAt yetib kelgan bo'lsa, qoidani bajaramiz
  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    try {
      const { processed } = await this.service.processDueRules()
      if (processed > 0) {
        this.logger.log(`Processed ${processed} recurring rules`)
      }
    } catch (err) {
      this.logger.error('Recurring cron failed', err)
    }
  }
}
