import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface PushSubscriptionData {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(private prisma: PrismaService) {}

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || ''
  }

  async subscribe(companyId: string, userId: string, subscription: PushSubscriptionData) {
    const key = `${companyId}:${userId}:${subscription.endpoint.slice(-20)}`
    await this.prisma.integrationConfig.upsert({
      where:  { companyId_type: { companyId, type: `PUSH_SUB_${key}` } },
      update: { config: subscription as any },
      create: { companyId, type: `PUSH_SUB_${key}`, config: subscription as any, isActive: true },
    }).catch(() => null)
    return { ok: true }
  }

  async unsubscribe(companyId: string, userId: string, endpoint: string) {
    const key = `${companyId}:${userId}:${endpoint.slice(-20)}`
    await this.prisma.integrationConfig.deleteMany({
      where: { companyId, type: `PUSH_SUB_${key}` },
    }).catch(() => null)
    return { ok: true }
  }

  async sendToCompany(companyId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
    try {
      // Dynamic import so it doesn't crash if web-push isn't installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpush = await (import('web-push' as any) as Promise<any>).catch(() => null)
      if (!webpush) { this.logger.warn('web-push not installed — skipping push'); return }

      const publicKey  = process.env.VAPID_PUBLIC_KEY
      const privateKey = process.env.VAPID_PRIVATE_KEY
      const email      = process.env.VAPID_EMAIL || 'mailto:admin@bizzo.uz'
      if (!publicKey || !privateKey) return

      webpush.setVapidDetails(email, publicKey, privateKey)

      const subs = await this.prisma.integrationConfig.findMany({
        where: { companyId, type: { startsWith: `PUSH_SUB_${companyId}:` }, isActive: true },
      })

      await Promise.allSettled(
        subs.map(s => {
          const sub = s.config as any as PushSubscriptionData
          return webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify(payload),
          ).catch(err => {
            // 410 = subscription expired — remove it
            if (err?.statusCode === 410) {
              this.prisma.integrationConfig.delete({ where: { id: s.id } }).catch(() => null)
            }
          })
        })
      )
    } catch (err) {
      this.logger.error('Push send failed', err)
    }
  }
}
