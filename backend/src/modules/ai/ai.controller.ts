import {
  Controller, Get, Post, Body,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { AiService } from './ai.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  query(
    @CurrentUser() user: any,
    @Body('question') question: string,
  ) {
    return this.aiService.query(user.companyId, question)
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: any) {
    return this.aiService.getRecommendations(user.companyId)
  }

  @Get('dashboard')
  getDashboardInsights(@CurrentUser() user: any) {
    return this.aiService.getDashboardInsights(user.companyId)
  }

  @Post('parse-invoice')
  @ApiOperation({ summary: 'Yetkazib beruvchi invoys rasmidan qatorlarni ajratib olish' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  parseInvoice(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi')
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Faqat rasm fayllarini qabul qilamiz')
    }
    const base64 = file.buffer.toString('base64')
    return this.aiService.parseInvoiceImage(user.companyId, base64, file.mimetype)
  }
}
