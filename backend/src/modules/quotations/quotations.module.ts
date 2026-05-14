import { Module } from '@nestjs/common'
import { QuotationsController } from './quotations.controller'
import { QuotationsService } from './quotations.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AutomationModule } from '../automation/automation.module'

@Module({
  imports:     [PrismaModule, AutomationModule],
  controllers: [QuotationsController],
  providers:   [QuotationsService],
  exports:     [QuotationsService],
})
export class QuotationsModule {}
