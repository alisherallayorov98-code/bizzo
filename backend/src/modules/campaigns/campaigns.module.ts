import { Module } from '@nestjs/common'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { IntegrationsModule } from '../integrations/integrations.module'

@Module({
  imports:     [PrismaModule, IntegrationsModule],
  controllers: [CampaignsController],
  providers:   [CampaignsService],
  exports:     [CampaignsService],
})
export class CampaignsModule {}
