import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import axios from 'axios'

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name)

  constructor(private prisma: PrismaService) {}

  async sendMessage(
    companyId: string,
    chatId: string,
    text: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
    })

    if (!cfg || !cfg.isActive) {
      return { success: false, error: 'Telegram integratsiyasi ulangan emas' }
    }

    const { botToken } = cfg.config as any

    try {
      const resp = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        { chat_id: chatId, text, parse_mode: parseMode },
      )

      await this.logNotification(companyId, chatId, text, 'SENT')
      await this.prisma.integrationConfig.update({
        where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
        data: { lastSyncAt: new Date() },
      })

      return { success: true, messageId: resp.data.result.message_id }
    } catch (err: any) {
      const error = err?.response?.data?.description || err.message
      this.logger.error(`Telegram xabar yuborishda xatolik: ${error}`)
      await this.logNotification(companyId, chatId, text, 'FAILED', error)
      return { success: false, error }
    }
  }

  async notifyNewOrder(companyId: string, orderData: {
    orderNumber: string
    clientName: string
    amount: number
    currency: string
  }): Promise<void> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
    })
    if (!cfg || !cfg.isActive) return

    const { notifyChannelId } = cfg.config as any
    if (!notifyChannelId) return

    const text = [
      '<b>Yangi buyurtma!</b>',
      `Raqam: <code>${orderData.orderNumber}</code>`,
      `Mijoz: ${orderData.clientName}`,
      `Summa: ${orderData.amount.toLocaleString()} ${orderData.currency}`,
    ].join('\n')

    await this.sendMessage(companyId, notifyChannelId, text)
  }

  async notifyLowStock(companyId: string, items: Array<{
    name: string
    quantity: number
    unit: string
    minStock: number
  }>): Promise<void> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
    })
    if (!cfg || !cfg.isActive) return

    const { notifyChannelId } = cfg.config as any
    if (!notifyChannelId || !items.length) return

    const lines = items.map(
      i => `- ${i.name}: ${i.quantity} ${i.unit} (min: ${i.minStock})`,
    ).join('\n')

    const text = [
      '<b>Omborda kam qolgan mahsulotlar</b>',
      lines,
    ].join('\n')

    await this.sendMessage(companyId, notifyChannelId, text)
  }

  async notifyDebtOverdue(companyId: string, debts: Array<{
    contactName: string
    amount: number
    currency: string
    daysOverdue: number
  }>): Promise<void> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
    })
    if (!cfg || !cfg.isActive) return

    const { notifyChannelId } = cfg.config as any
    if (!notifyChannelId || !debts.length) return

    const lines = debts.map(
      d => `- ${d.contactName}: ${d.amount.toLocaleString()} ${d.currency} (${d.daysOverdue} kun o'tdi)`,
    ).join('\n')

    const text = [
      '<b>Muddati o\'tgan qarzlar</b>',
      lines,
    ].join('\n')

    await this.sendMessage(companyId, notifyChannelId, text)
  }

  async getBotInfo(botToken: string): Promise<{ ok: boolean; name?: string; username?: string }> {
    try {
      const resp = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`)
      return {
        ok: true,
        name: resp.data.result.first_name,
        username: resp.data.result.username,
      }
    } catch {
      return { ok: false }
    }
  }

  private async logNotification(
    companyId: string,
    recipient: string,
    message: string,
    status: string,
    errorMsg?: string,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        companyId,
        type: 'TELEGRAM',
        recipient,
        message,
        status,
        errorMsg,
        sentAt: status === 'SENT' ? new Date() : null,
      },
    })
  }
}
