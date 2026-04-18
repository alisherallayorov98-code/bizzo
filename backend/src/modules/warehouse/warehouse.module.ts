import { Module }              from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService }    from './warehouse.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [WarehouseController],
  providers:   [WarehouseService],
  exports:     [WarehouseService],
})
export class WarehouseModule {}
