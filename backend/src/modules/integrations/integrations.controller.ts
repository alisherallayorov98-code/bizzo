import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, HttpCode,
} from '@nestjs/common'
import { IntegrationsService }  from './integrations.service'
import { SmsService }           from './sms/sms.service'
import { TelegramService }      from './telegram/telegram.service'
import { TelegramBotService }   from './telegram/telegram-bot.service'

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private integrationsService: IntegrationsService,
    private smsService:          SmsService,
    private telegramService:     TelegramService,
    private telegramBotService:  TelegramBotService,
  ) {}

  // Barcha integratsiyalar ro'yxati
  @Get()
  getAll(@Req() req: any) {
    return this.integrationsService.getAll(req.user.companyId)
  }

  // Integratsiyani saqlash/yangilash
  @Post(':type')
  save(
    @Req() req: any,
    @Param('type') type: string,
    @Body() body: { config: Record<string, any>; isActive: boolean },
  ) {
    return this.integrationsService.save(
      req.user.companyId,
      type,
      body.config,
      body.isActive,
    )
  }

  // Faol/faolsizlashtirish
  @Patch(':type/toggle')
  toggle(@Req() req: any, @Param('type') type: string) {
    return this.integrationsService.toggle(req.user.companyId, type)
  }

  // SMS yuborish
  @Post('sms/send')
  sendSms(
    @Req() req: any,
    @Body() body: { phone: string; message: string },
  ) {
    return this.smsService.send(req.user.companyId, body.phone, body.message)
  }

  // SMS ommaviy yuborish
  @Post('sms/send-bulk')
  sendBulkSms(
    @Req() req: any,
    @Body() body: { phones: string[]; message: string },
  ) {
    return this.smsService.sendBulk(req.user.companyId, body.phones, body.message)
  }

  // Telegram bot webhook (public — no auth)
  @Post('telegram/webhook/:companyId')
  @HttpCode(200)
  async telegramWebhook(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    await this.telegramBotService.handleWebhook(companyId, body)
    return { ok: true }
  }

  // Telegram test xabar
  @Post('telegram/test-message')
  async sendTestMessage(
    @Req() req: any,
    @Body() body: { chatId: string },
  ) {
    return this.telegramBotService.sendTestMessage(req.user.companyId, body.chatId)
  }

  // Telegram stats (bot orqali)
  @Post('telegram/send-stats')
  @HttpCode(200)
  async sendTelegramStats(
    @Req() req: any,
    @Body() body: { chatId: string },
  ) {
    await this.telegramBotService.sendStats(req.user.companyId, body.chatId)
    return { success: true }
  }

  // Telegram test
  @Post('telegram/test')
  async testTelegram(
    @Req() req: any,
    @Body() body: { chatId: string; message: string },
  ) {
    return this.telegramService.sendMessage(
      req.user.companyId,
      body.chatId,
      body.message,
    )
  }

  // Telegram bot ma'lumotlari
  @Post('telegram/bot-info')
  getTelegramBotInfo(@Body() body: { botToken: string }) {
    return this.telegramService.getBotInfo(body.botToken)
  }

  // Bildirishnoma loglari
  @Get('logs')
  getLogs(
    @Req() req: any,
    @Query('type')   type?: string,
    @Query('status') status?: string,
    @Query('limit')  limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.integrationsService.getLogs(req.user.companyId, {
      type,
      status,
      limit:  limit  ? parseInt(limit)  : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  }

  // Statistika
  @Get('stats')
  getStats(@Req() req: any) {
    return this.integrationsService.getStats(req.user.companyId)
  }
}
