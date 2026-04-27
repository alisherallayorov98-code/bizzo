import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { AssistantController } from './assistant.controller'
import { AssistantService } from './assistant.service'

@Module({
  imports:     [MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })],
  controllers: [AssistantController],
  providers:   [AssistantService],
  exports:     [AssistantService],
})
export class AssistantModule {}
