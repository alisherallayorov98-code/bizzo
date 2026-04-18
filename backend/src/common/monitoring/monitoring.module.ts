import { Global, Module } from '@nestjs/common';
import { TelegramAlerter } from './telegram-alerter';

@Global()
@Module({
  providers: [TelegramAlerter],
  exports: [TelegramAlerter],
})
export class MonitoringModule {}
