import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { RecurringController } from './recurring.controller'
import { RecurringService } from './recurring.service'
import { RecurringCronService } from './recurring-cron.service'

@Module({
  imports:     [ScheduleModule.forRoot()],
  controllers: [RecurringController],
  providers:   [RecurringService, RecurringCronService],
  exports:     [RecurringService],
})
export class RecurringModule {}
