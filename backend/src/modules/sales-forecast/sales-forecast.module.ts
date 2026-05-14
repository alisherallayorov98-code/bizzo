import { Module } from '@nestjs/common'
import { SalesForecastController } from './sales-forecast.controller'
import { SalesForecastService } from './sales-forecast.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  controllers: [SalesForecastController],
  providers:   [SalesForecastService],
  exports:     [SalesForecastService],
})
export class SalesForecastModule {}
