import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
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
}
