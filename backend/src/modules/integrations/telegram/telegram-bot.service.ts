import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService }    from '../../../prisma/prisma.service'
import { TelegramService }  from './telegram.service'
import axios from 'axios'

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name)

  constructor(
    private prisma:   PrismaService,
    private telegram: TelegramService,
  ) {}

  // ─── Webhook handler ─────────────────────────────────────────────────────

  async handleWebhook(companyId: string, body: any): Promise<void> {
    const message = body?.message
    if (!message?.text) return

    const chatId  = String(message.chat.id)
    const text    = (message.text as string).trim()
    const command = text.split(' ')[0].toLowerCase()

    switch (command) {
      case '/start':
        await this.telegram.sendMessage(companyId, chatId,
          `🚀 <b>BiznesERP Botiga xush kelibsiz!</b>\n\n` +
          `Mavjud buyruqlar:\n` +
          `/stats — Bugungi statistika\n` +
          `/debts — Muddati o'tgan qarzlar\n` +
          `/lowstock — Zaxirasi kam mahsulotlar\n` +
          `/today — Bugungi tranzaksiyalar\n` +
          `/help — Yordam`
        )
        break
      case '/stats':
        await this.sendStats(companyId, chatId)
        break
      case '/debts':
        await this.sendOverdueDebts(companyId, chatId)
        break
      case '/lowstock':
        await this.sendLowStock(companyId, chatId)
        break
      case '/today':
        await this.sendTodaySummary(companyId, chatId)
        break
      case '/help':
        await this.telegram.sendMessage(companyId, chatId,
          `ℹ️ <b>Yordam</b>\n\n` +
          `/stats — Umumiy statistika\n` +
          `/debts — Muddati o'tgan qarzlar (top 5)\n` +
          `/lowstock — Zaxirasi kam mahsulotlar (top 5)\n` +
          `/today — Bugungi kirim/chiqim\n\n` +
          `Kunlik hisobot avtomatik soat 09:00 da yuboriladi.`
        )
        break
      default:
        await this.telegram.sendMessage(companyId, chatId,
          `❓ Noma'lum buyruq. /help ni yozing.`
        )
    }
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  async sendStats(companyId: string, chatId: string) {
    const [receivable, payable, avansGiven, avansReceived] = await Promise.all([
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'RECEIVABLE', isPaid: false },
        _sum:  { remaining: true }, _count: true,
      }).catch(() => ({ _sum: { remaining: 0 }, _count: 0 })),
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'PAYABLE', isPaid: false },
        _sum:  { remaining: true }, _count: true,
      }).catch(() => ({ _sum: { remaining: 0 }, _count: 0 })),
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'GIVEN', isFullyUsed: false },
        _sum:  { remaining: true }, _count: true,
      }).catch(() => ({ _sum: { remaining: 0 }, _count: 0 })),
      this.prisma.avansRecord.aggregate({
        where: { companyId, type: 'RECEIVED', isFullyUsed: false },
        _sum:  { remaining: true }, _count: true,
      }).catch(() => ({ _sum: { remaining: 0 }, _count: 0 })),
    ])

    const fmt = (n: any) => Number(n ?? 0).toLocaleString('uz-UZ')
    const rec   = Number(receivable._sum?.remaining ?? 0)
    const pay   = Number(payable._sum?.remaining   ?? 0)
    const net   = rec - pay
    const netSign = net >= 0 ? '▲' : '▼'

    const msg =
      `📊 <b>Umumiy balans</b>\n` +
      `────────────────────\n` +
      `📈 Debitorlar:  <b>${fmt(rec)} so'm</b> (${(receivable as any)._count} ta)\n` +
      `📉 Kreditorlar: <b>${fmt(pay)} so'm</b> (${(payable as any)._count} ta)\n` +
      `────────────────────\n` +
      `${netSign} Sof balans: <b>${fmt(Math.abs(net))} so'm</b>\n\n` +
      `💰 Berilgan avans: ${fmt(Number(avansGiven._sum?.remaining ?? 0))} so'm\n` +
      `💵 Olingan avans:  ${fmt(Number(avansReceived._sum?.remaining ?? 0))} so'm`

    await this.telegram.sendMessage(companyId, chatId, msg)
  }

  // ─── Muddati o'tgan qarzlar ───────────────────────────────────────────────

  async sendOverdueDebts(companyId: string, chatId: string) {
    const debts = await this.prisma.debtRecord.findMany({
      where:   { companyId, isPaid: false, dueDate: { lt: new Date() } },
      orderBy: { remaining: 'desc' },
      take:    5,
      include: { contact: { select: { name: true } } },
    }).catch(() => [])

    if (!debts.length) {
      await this.telegram.sendMessage(companyId, chatId,
        `✅ <b>Muddati o'tgan qarzlar yo'q!</b>\nHamma qarzlar o'z vaqtida.`
      )
      return
    }

    const lines = debts.map((d, i) => {
      const days = Math.floor((Date.now() - d.dueDate!.getTime()) / 86400000)
      return `${i + 1}. <b>${d.contact?.name ?? '—'}</b>\n` +
             `   💸 ${Number(d.remaining).toLocaleString()} so'm · ${days} kun kechikkan`
    }).join('\n\n')

    await this.telegram.sendMessage(companyId, chatId,
      `⚠️ <b>Muddati o'tgan qarzlar (top ${debts.length})</b>\n\n${lines}`
    )
  }

  // ─── Zaxirasi kam mahsulotlar ─────────────────────────────────────────────

  async sendLowStock(companyId: string, chatId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.name, p."minStock", si.quantity, w.name as warehouse_name
      FROM stock_items si
      JOIN products p  ON p.id = si."productId"
      JOIN warehouses w ON w.id = si."warehouseId"
      WHERE p."companyId" = ${companyId}
        AND p."minStock" > 0
        AND si.quantity <= p."minStock"
      ORDER BY (p."minStock" - si.quantity) DESC
      LIMIT 5
    `.catch(() => [])

    if (!rows.length) {
      await this.telegram.sendMessage(companyId, chatId,
        `✅ <b>Zaxirada muammo yo'q!</b>\nBarcha mahsulotlar yetarli.`
      )
      return
    }

    const lines = rows.map((r, i) =>
      `${i + 1}. <b>${r.name}</b>\n` +
      `   📦 Mavjud: ${r.quantity} · Minimum: ${r.minStock} · ${r.warehouse_name}`
    ).join('\n\n')

    await this.telegram.sendMessage(companyId, chatId,
      `🔴 <b>Zaxirasi kam mahsulotlar (top ${rows.length})</b>\n\n${lines}`
    )
  }

  // ─── Bugungi summary ─────────────────────────────────────────────────────

  async sendTodaySummary(companyId: string, chatId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [payments, avansCreated, debtsCreated] = await Promise.all([
      this.prisma.debtPayment.aggregate({
        where: { companyId, createdAt: { gte: today, lt: tomorrow } },
        _sum:  { amount: true }, _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),
      this.prisma.avansRecord.aggregate({
        where: { companyId, createdAt: { gte: today, lt: tomorrow } },
        _sum:  { amount: true }, _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),
      this.prisma.debtRecord.count({
        where: { companyId, createdAt: { gte: today, lt: tomorrow } },
      }).catch(() => 0),
    ])

    const fmt = (n: any) => Number(n ?? 0).toLocaleString('uz-UZ')
    const dateStr = today.toLocaleDateString('uz-UZ')

    const msg =
      `📅 <b>Bugungi hisobot (${dateStr})</b>\n` +
      `────────────────────\n` +
      `💳 To'lovlar: <b>${fmt(payments._sum?.amount)} so'm</b> (${(payments as any)._count} ta)\n` +
      `🆕 Yangi qarzlar: <b>${debtsCreated} ta</b>\n` +
      `💰 Yangi avanslar: <b>${fmt(avansCreated._sum?.amount)} so'm</b> (${(avansCreated as any)._count} ta)`

    await this.telegram.sendMessage(companyId, chatId, msg)
  }

  // ─── Kunlik avtomatik hisobot (09:00) ────────────────────────────────────

  @Cron('0 9 * * *')
  async sendDailyReports() {
    const configs = await this.prisma.integrationConfig.findMany({
      where: { type: 'TELEGRAM_BOT', isActive: true },
    }).catch(() => [])

    for (const cfg of configs) {
      const settings = cfg.config as any
      if (!settings?.dailyReport) continue

      const chatId = settings.reportChatId ?? settings.chatId
      if (!chatId) continue

      try {
        await this.sendStats(cfg.companyId, chatId)
        await this.sendOverdueDebts(cfg.companyId, chatId)
      } catch (e) {
        this.logger.error(`Daily report failed for ${cfg.companyId}`, e)
      }
    }
  }

  // ─── Qarz eslatmasi yuborish ─────────────────────────────────────────────

  async sendDebtAlert(companyId: string, contactName: string, amount: number, daysOverdue: number) {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'TELEGRAM_BOT' } },
    }).catch(() => null)

    if (!cfg?.isActive) return
    const settings = cfg.config as any
    if (!settings?.debtAlert) return

    const chatId = settings.reportChatId ?? settings.chatId
    if (!chatId) return

    await this.telegram.sendMessage(companyId, chatId,
      `⚠️ <b>Qarz eslatmasi</b>\n\n` +
      `👤 Kontakt: <b>${contactName}</b>\n` +
      `💸 Summa: <b>${amount.toLocaleString('uz-UZ')} so'm</b>\n` +
      `📅 ${daysOverdue} kun kechikkan`
    )
  }

  // ─── Test xabar ──────────────────────────────────────────────────────────

  async sendTestMessage(companyId: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    return this.telegram.sendMessage(companyId, chatId,
      `✅ <b>BiznesERP test xabari</b>\n\nBot muvaffaqiyatli ulandi! 🎉\n\n/help — barcha buyruqlarni ko'rish`
    )
  }
}
