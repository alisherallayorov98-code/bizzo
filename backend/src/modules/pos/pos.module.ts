import { Module }    from '@nestjs/common'
import { PosService }    from './pos.service'
import { PosController } from './pos.controller'
import { PrismaModule }  from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  controllers: [PosController],
  providers:   [PosService],
  exports:     [PosService],
})
export class PosModule {}
