import { Module } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { IntegrationsController } from './integrations.controller'
import { SmsService } from './sms/sms.service'
import { TelegramService } from './telegram/telegram.service'
import { DidoxService } from './didox/didox.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    SmsService,
    TelegramService,
    DidoxService,
  ],
  exports: [SmsService, TelegramService, DidoxService],
})
export class IntegrationsModule {}
