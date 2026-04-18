import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export const INTEGRATION_TYPES = [
  {
    type:        'ESKIZ_SMS',
    name:        'Eskiz SMS',
    description: "O'zbekistonda SMS yuborish uchun Eskiz.uz xizmati",
    category:    'messaging',
    color:       '#0066FF',
    configFields: [
      { key: 'login',    label: 'Login (Email)',  type: 'email',    required: true },
      { key: 'password', label: 'API Parol',       type: 'password', required: true },
      { key: 'senderId', label: 'Sender ID',        type: 'text',     required: false, placeholder: '4546' },
    ],
  },
  {
    type:        'TELEGRAM_BOT',
    name:        'Telegram Bot',
    description: "Bildirishnomalar uchun Telegram bot integratsiyasi",
    category:    'messaging',
    color:       '#2CA5E0',
    configFields: [
      { key: 'botToken',        label: 'Bot Token',         type: 'password', required: true  },
      { key: 'notifyChannelId', label: 'Kanal/Chat ID',     type: 'text',     required: false },
    ],
  },
  {
    type:        'DIDOX',
    name:        "Didox (Elektron hisob-faktura)",
    description: "Soliq organlari uchun elektron hisob-faktura tizimi",
    category:    'accounting',
    color:       '#00AA44',
    configFields: [
      { key: 'apiKey',   label: 'API Kalit',   type: 'password', required: true },
      { key: 'clientId', label: 'Client ID',    type: 'text',     required: true },
      { key: 'tin',      label: 'Korxona STIR', type: 'text',     required: true },
    ],
  },
]

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async getAll(companyId: string) {
    const configs = await this.prisma.integrationConfig.findMany({
      where: { companyId },
    })

    const configMap = new Map(configs.map(c => [c.type, c]))

    return INTEGRATION_TYPES.map(def => {
      const saved = configMap.get(def.type)
      const safeConfig = saved
        ? this.maskSecrets(saved.config as Record<string, any>, def.configFields)
        : {}

      return {
        ...def,
        isActive:   saved?.isActive   || false,
        lastSyncAt: saved?.lastSyncAt || null,
        config:     safeConfig,
      }
    })
  }

  async getOne(companyId: string, type: string) {
    return this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type } },
    })
  }

  async save(
    companyId: string,
    type: string,
    config: Record<string, any>,
    isActive: boolean,
  ) {
    return this.prisma.integrationConfig.upsert({
      where: { companyId_type: { companyId, type } },
      create: { companyId, type, config, isActive },
      update: { config, isActive, updatedAt: new Date() },
    })
  }

  async toggle(companyId: string, type: string) {
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type } },
    })

    if (!existing) {
      return this.prisma.integrationConfig.create({
        data: { companyId, type, isActive: true, config: {} },
      })
    }

    return this.prisma.integrationConfig.update({
      where: { companyId_type: { companyId, type } },
      data: { isActive: !existing.isActive },
    })
  }

  async getLogs(
    companyId: string,
    filters: {
      type?:  string
      status?: string
      limit?:  number
      offset?: number
    },
  ) {
    const where: any = { companyId }
    if (filters.type)   where.type   = filters.type
    if (filters.status) where.status = filters.status

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    filters.limit  || 50,
        skip:    filters.offset || 0,
      }),
      this.prisma.notificationLog.count({ where }),
    ])

    return { logs, total }
  }

  async getStats(companyId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [smsSent, smsFailed, telegramSent, telegramFailed] = await Promise.all([
      this.prisma.notificationLog.count({
        where: { companyId, type: 'SMS',      status: 'SENT',   createdAt: { gte: since } },
      }),
      this.prisma.notificationLog.count({
        where: { companyId, type: 'SMS',      status: 'FAILED', createdAt: { gte: since } },
      }),
      this.prisma.notificationLog.count({
        where: { companyId, type: 'TELEGRAM', status: 'SENT',   createdAt: { gte: since } },
      }),
      this.prisma.notificationLog.count({
        where: { companyId, type: 'TELEGRAM', status: 'FAILED', createdAt: { gte: since } },
      }),
    ])

    return {
      period: '30 kun',
      sms:      { sent: smsSent,      failed: smsFailed      },
      telegram: { sent: telegramSent, failed: telegramFailed },
    }
  }

  private maskSecrets(
    config: Record<string, any>,
    fields: Array<{ key: string; type: string }>,
  ): Record<string, any> {
    const result: Record<string, any> = {}
    for (const field of fields) {
      const val = config[field.key]
      if (!val) continue
      result[field.key] = field.type === 'password' ? '***masked***' : val
    }
    return result
  }
}
