import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../prisma/prisma.service'
import axios from 'axios'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)
  private token: string | null = null
  private tokenExpiry: Date | null = null

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async getToken(login: string, password: string): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    const resp = await axios.post('https://notify.eskiz.uz/api/auth/login', {
      email: login,
      password,
    })

    this.token = resp.data.data.token
    // Token 30 daqiqa amal qiladi
    this.tokenExpiry = new Date(Date.now() + 29 * 60 * 1000)
    return this.token
  }

  async send(
    companyId: string,
    phone: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'ESKIZ_SMS' } },
    })

    if (!cfg || !cfg.isActive) {
      return { success: false, error: 'SMS integratsiyasi ulangan emas' }
    }

    const { login, password, senderId } = cfg.config as any

    try {
      const token = await this.getToken(login, password)
      const resp = await axios.post(
        'https://notify.eskiz.uz/api/message/sms/send',
        {
          mobile_phone: phone.replace(/\D/g, ''),
          message,
          from: senderId || '4546',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      await this.logNotification(companyId, 'SMS', phone, message, 'SENT')
      await this.prisma.integrationConfig.update({
        where: { companyId_type: { companyId, type: 'ESKIZ_SMS' } },
        data: { lastSyncAt: new Date() },
      })

      return { success: true, messageId: resp.data.id }
    } catch (err: any) {
      const error = err?.response?.data?.message || err.message
      this.logger.error(`SMS yuborishda xatolik: ${error}`)
      await this.logNotification(companyId, 'SMS', phone, message, 'FAILED', error)
      return { success: false, error }
    }
  }

  async sendBulk(
    companyId: string,
    phones: string[],
    message: string,
  ): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      phones.map(p => this.send(companyId, p, message)),
    )
    const sent   = results.filter(r => r.status === 'fulfilled' && (r as any).value.success).length
    const failed = phones.length - sent
    return { sent, failed }
  }

  private async logNotification(
    companyId: string,
    type: string,
    recipient: string,
    message: string,
    status: string,
    errorMsg?: string,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        companyId,
        type,
        recipient,
        message,
        status,
        errorMsg,
        sentAt: status === 'SENT' ? new Date() : null,
      },
    })
  }
}
