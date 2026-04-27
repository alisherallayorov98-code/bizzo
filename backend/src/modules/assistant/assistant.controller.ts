import {
  Controller, Post, Body,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { AssistantService } from './assistant.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Assistant')
@ApiBearerAuth('access-token')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('text')
  @ApiOperation({ summary: 'Yozma buyruq (Claude orqali)' })
  async processText(
    @CurrentUser() user: any,
    @Body('text') text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Matn bo\'sh bo\'la olmaydi')
    const action = await this.service.processText(user.companyId, text.trim())
    return await this.enrichAction(user.companyId, action)
  }

  @Post('voice')
  @ApiOperation({ summary: 'Ovozli buyruq (Gemini orqali)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  }))
  async processVoice(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Audio yuklanmadi')
    const base64 = file.buffer.toString('base64')
    const action = await this.service.processVoice(user.companyId, base64, file.mimetype)
    return await this.enrichAction(user.companyId, action)
  }

  @Post('query')
  @ApiOperation({ summary: 'Tizim ma\'lumotlarini so\'rash' })
  resolveQuery(
    @CurrentUser() user: any,
    @Body() body: { type: string; params?: any },
  ) {
    return this.service.resolveQuery(user.companyId, body.type, body.params)
  }

  // Action ichida find_contact/find_product bo'lsa, bazadan haqiqiy ID topib qo'shamiz
  private async enrichAction(companyId: string, action: any) {
    if (action.action === 'find_contact' && action.name) {
      const contact = await this.service.findContact(companyId, action.name)
      return { ...action, contact }
    }
    if (action.action === 'find_product' && action.name) {
      const product = await this.service.findProduct(companyId, action.name)
      return { ...action, product }
    }
    if (action.action === 'contact_report' && action.name) {
      const contact = await this.service.findContact(companyId, action.name)
      return { ...action, contact }
    }
    if (action.action === 'create_incoming' || action.action === 'create_outgoing') {
      // Kontakt va mahsulotlarni topib, ID bilan birga qaytaramiz
      if (action.contactName) {
        const contact = await this.service.findContact(companyId, action.contactName)
        action.contactId = contact?.id
      }
      if (Array.isArray(action.lines)) {
        for (const line of action.lines) {
          if (line.productName) {
            const p = await this.service.findProduct(companyId, line.productName)
            line.productId = p?.id
            line.product   = p
          }
        }
      }
      return action
    }
    if (action.action === 'query' && action.type) {
      const result = await this.service.resolveQuery(companyId, action.type, action)
      return { ...action, result }
    }
    return action
  }
}
