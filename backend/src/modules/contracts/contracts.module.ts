import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractReminderService } from './contracts.reminder.service';

@Module({
  imports: [PrismaModule, EmailModule, ScheduleModule.forRoot()],
  controllers: [ContractsController],
  providers: [ContractsService, ContractReminderService],
  exports: [ContractsService],
})
export class ContractsModule {}
