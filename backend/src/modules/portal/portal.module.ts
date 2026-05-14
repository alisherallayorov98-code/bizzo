import { Module }    from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PortalService }    from './portal.service'
import { PortalController } from './portal.controller'
import { PrismaModule }     from '../../prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:      process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [PortalController],
  providers:   [PortalService],
  exports:     [PortalService],
})
export class PortalModule {}
