import { Module }              from '@nestjs/common'
import { ProductionController } from './production.controller'
import { ProductionService }    from './production.service'
import { PrismaModule }         from '../../../prisma/prisma.module'
import { NotificationsModule }  from '../../notifications/notifications.module'

@Module({
  imports:     [PrismaModule, NotificationsModule],
  controllers: [ProductionController],
  providers:   [ProductionService],
  exports:     [ProductionService],
})
export class ProductionModule {}
