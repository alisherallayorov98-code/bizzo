import { Module }       from '@nestjs/common'
import { MulterModule }  from '@nestjs/platform-express'
import { AiController } from './ai.controller'
import { AiService }    from './ai.service'

@Module({
  imports:     [MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })],
  controllers: [AiController],
  providers:   [AiService],
  exports:     [AiService],
})
export class AiModule {}
