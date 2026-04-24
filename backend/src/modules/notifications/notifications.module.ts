import { Module }                     from '@nestjs/common';
import { JwtModule }                  from '@nestjs/jwt';
import { ScheduleModule }             from '@nestjs/schedule';
import { NotificationsController }    from './notifications.controller';
import { NotificationsService }       from './notifications.service';
import { NotificationsGateway }       from './notifications.gateway';
import { NotificationsCronService }   from './notifications-cron.service';
import { PrismaModule }               from '../../prisma/prisma.module';
import { IntegrationsModule }         from '../integrations/integrations.module';

@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:      process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers:   [NotificationsService, NotificationsGateway, NotificationsCronService],
  exports:     [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
