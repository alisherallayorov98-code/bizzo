import { Module }               from '@nestjs/common'
import { ScheduleModule }       from '@nestjs/schedule'
import { DebtsController }      from './debts.controller'
import { DebtsService }         from './debts.service'
import { DebtsCronService }     from './debts-cron.service'
import { NotificationsModule }  from '../notifications/notifications.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [DebtsController],
  providers:   [DebtsService, DebtsCronService],
  exports:     [DebtsService],
})
export class DebtsModule {}
