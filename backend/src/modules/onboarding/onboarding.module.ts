import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
