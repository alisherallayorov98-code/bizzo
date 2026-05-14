import { Module }                 from '@nestjs/common'
import { ScheduleModule }        from '@nestjs/schedule'
import { IntegrationsService }   from './integrations.service'
import { IntegrationsController } from './integrations.controller'
import { SmsService }            from './sms/sms.service'
import { TelegramService }       from './telegram/telegram.service'
import { TelegramBotService }    from './telegram/telegram-bot.service'
import { DidoxService }          from './didox/didox.service'
import { PrismaModule }          from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule, ScheduleModule.forRoot()],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    SmsService,
    TelegramService,
    TelegramBotService,
    DidoxService,
  ],
  exports: [SmsService, TelegramService, TelegramBotService, DidoxService],
})
export class IntegrationsModule {}
