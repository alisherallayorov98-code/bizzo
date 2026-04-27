import { Module } from '@nestjs/common'
import { CashExpensesController } from './cash-expenses.controller'
import { CashExpensesService } from './cash-expenses.service'
import { DriversService } from './drivers.service'

@Module({
  controllers: [CashExpensesController],
  providers:   [CashExpensesService, DriversService],
  exports:     [CashExpensesService, DriversService],
})
export class CashExpensesModule {}
