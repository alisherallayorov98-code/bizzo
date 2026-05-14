import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AutomationController } from './automation.controller'
import { AutomationService } from './automation.service'
import { AutomationEngineService } from './automation-engine.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [AutomationController],
  providers:   [AutomationService, AutomationEngineService],
  exports:     [AutomationEngineService],
})
export class AutomationModule {}
