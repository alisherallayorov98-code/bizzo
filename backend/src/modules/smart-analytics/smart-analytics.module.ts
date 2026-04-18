import { Module } from '@nestjs/common';
import { SmartAnalyticsService } from './smart-analytics.service';
import { SmartAnalyticsController } from './smart-analytics.controller';

@Module({
  controllers: [SmartAnalyticsController],
  providers:   [SmartAnalyticsService],
  exports:     [SmartAnalyticsService],
})
export class SmartAnalyticsModule {}
