import { Module }         from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { CurrencyService }    from './currency.service'
import { CurrencyController } from './currency.controller'
import { PrismaModule }   from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule, ScheduleModule.forRoot()],
  controllers: [CurrencyController],
  providers:   [CurrencyService],
  exports:     [CurrencyService],
})
export class CurrencyModule {}
