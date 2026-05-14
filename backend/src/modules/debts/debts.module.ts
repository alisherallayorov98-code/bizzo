import { Module }               from '@nestjs/common'
import { ScheduleModule }       from '@nestjs/schedule'
import { DebtsController }      from './debts.controller'
import { DebtsService }         from './debts.service'
import { AvansService }         from './avans.service'
import { DebtsCronService }     from './debts-cron.service'
import { NotificationsModule }  from '../notifications/notifications.module'
import { IntegrationsModule }   from '../integrations/integrations.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    IntegrationsModule,
  ],
  controllers: [DebtsController],
  providers:   [DebtsService, AvansService, DebtsCronService],
  exports:     [DebtsService, AvansService],
})
export class DebtsModule {}
