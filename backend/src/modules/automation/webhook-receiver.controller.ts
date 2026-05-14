import { Controller, Post, Param, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AutomationService } from './automation.service'

@ApiTags('Webhook Receiver')
@Controller('webhook')
export class WebhookReceiverController {
  constructor(private readonly svc: AutomationService) {}

  @Post(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiruvchi webhook qabul qilish (ochiq endpoint)' })
  receive(
    @Param('slug') slug: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.svc.receiveWebhook(slug, payload, headers)
  }
}
