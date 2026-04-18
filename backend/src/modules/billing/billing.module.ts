import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { InvoiceService } from './invoice.service'
import { PaymeService } from '../integrations/payme.service'
import { ClickService } from '../integrations/click.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService, PaymeService, ClickService],
  exports: [BillingService],
})
export class BillingModule {}
