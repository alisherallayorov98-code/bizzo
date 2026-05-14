import { Module } from '@nestjs/common'
import { PurchaseController } from './purchase.controller'
import { PurchaseService } from './purchase.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AutomationModule } from '../automation/automation.module'

@Module({
  imports:     [PrismaModule, AutomationModule],
  controllers: [PurchaseController],
  providers:   [PurchaseService],
  exports:     [PurchaseService],
})
export class PurchaseModule {}
