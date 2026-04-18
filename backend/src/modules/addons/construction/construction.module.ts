import { Module } from '@nestjs/common';
import { ConstructionController } from './construction.controller';
import { ConstructionService } from './construction.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [ConstructionController],
  providers:   [ConstructionService],
  exports:     [ConstructionService],
})
export class ConstructionModule {}
