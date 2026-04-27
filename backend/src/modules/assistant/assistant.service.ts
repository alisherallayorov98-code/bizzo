import { Injectable, Logger } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '../../prisma/prisma.service'
import { SYSTEM_PROMPT, AssistantAction } from './actions.schema'

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name)
  private claude: Anthropic | null
  private gemini: GoogleGenerativeAI | null

  constructor(private readonly prisma: PrismaService) {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null
    this.gemini = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null

    this.logger.log(
      `AssistantService init — Claude: ${this.claude ? 'YES (' + (process.env.ANTHROPIC_API_KEY?.length ?? 0) + ' chars)' : 'NO'}, ` +
      `Gemini: ${this.gemini ? 'YES (' + (process.env.GEMINI_API_KEY?.length ?? 0) + ' chars)' : 'NO'}`,
    )
  }

  // ============================================
  // YOZMA BUYRUQ — Claude orqali
  // ============================================
  async processText(_companyId: string, text: string): Promise<AssistantAction> {
    if (!this.claude) {
      return { action: 'unknown', message: 'AI sozlanmagan (ANTHROPIC_API_KEY yo\'q)' }
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      })

      const out = (response.content[0] as any)?.text ?? ''
      return this.parseJson(out)
    } catch (e: any) {
      this.logger.error(`Claude xatolik: ${e?.message}`)
      return { action: 'unknown', message: `AI xatolik: ${e?.message ?? e}` }
    }
  }

  // ============================================
  // OVOZLI BUYRUQ — Gemini orqali (audio nativ)
  // ============================================
  async processVoice(
    _companyId: string,
    audioBase64: string,
    mimeType: string,
  ): Promise<AssistantAction> {
    if (!this.gemini) {
      return { action: 'unknown', message: 'Gemini sozlanmagan (GEMINI_API_KEY yo\'q)' }
    }

    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
      })

      const result = await model.generateContent([
        { inlineData: { data: audioBase64, mimeType } },
        { text: 'Ovozdagi gapni tushun va JSON action qaytar.' },
      ])

      const out = result.response.text()
      return this.parseJson(out)
    } catch (e: any) {
      this.logger.error(`Gemini xatolik: ${e?.message}`)
      return { action: 'unknown', message: `Ovozni tushuntira olmadim: ${e?.message ?? e}` }
    }
  }

  // ============================================
  // QUERY — ma'lumot so'rovi (tizimdan to'g'ridan-to'g'ri)
  // ============================================
  async resolveQuery(companyId: string, type: string, params?: any): Promise<{ answer: string; data?: any }> {
    const today    = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const weekAgo  = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30)

    switch (type) {
      case 'today_sales': {
        const agg = await this.prisma.stockMovement.aggregate({
          where: { warehouse: { companyId }, type: 'OUT', createdAt: { gte: today, lt: tomorrow } },
          _sum:  { totalAmount: true },
          _count: true,
        })
        const total = Number(agg._sum.totalAmount ?? 0)
        return {
          answer: `Bugun ${agg._count} ta sotuv qilindi, jami ${total.toLocaleString('uz-UZ')} so'm`,
          data:   { total, count: agg._count },
        }
      }
      case 'week_sales': {
        const agg = await this.prisma.stockMovement.aggregate({
          where: { warehouse: { companyId }, type: 'OUT', createdAt: { gte: weekAgo } },
          _sum:  { totalAmount: true },
          _count: true,
        })
        const total = Number(agg._sum.totalAmount ?? 0)
        return {
          answer: `Oxirgi 7 kunda ${agg._count} ta sotuv, jami ${total.toLocaleString('uz-UZ')} so'm`,
          data:   { total, count: agg._count },
        }
      }
      case 'month_sales': {
        const agg = await this.prisma.stockMovement.aggregate({
          where: { warehouse: { companyId }, type: 'OUT', createdAt: { gte: monthAgo } },
          _sum:  { totalAmount: true },
          _count: true,
        })
        const total = Number(agg._sum.totalAmount ?? 0)
        return {
          answer: `Oxirgi 30 kunda ${agg._count} ta sotuv, jami ${total.toLocaleString('uz-UZ')} so'm`,
          data:   { total, count: agg._count },
        }
      }
      case 'cash_balance': {
        // Sotuv (kirim) - chiqim
        const [salesAgg, expensesAgg] = await Promise.all([
          this.prisma.stockMovement.aggregate({
            where: { warehouse: { companyId }, type: 'OUT', createdAt: { gte: monthAgo } },
            _sum: { totalAmount: true },
          }),
          this.prisma.cashExpense.aggregate({
            where: { companyId, expenseDate: { gte: monthAgo } },
            _sum: { amount: true },
          }).catch(() => ({ _sum: { amount: 0 } })),
        ])
        const sales    = Number(salesAgg._sum.totalAmount ?? 0)
        const expenses = Number(expensesAgg._sum.amount ?? 0)
        const balance  = sales - expenses
        return {
          answer: `Oxirgi 30 kun: kirim ${sales.toLocaleString('uz-UZ')} so'm, kassa chiqimi ${expenses.toLocaleString('uz-UZ')} so'm, sof: ${balance.toLocaleString('uz-UZ')} so'm`,
          data: { sales, expenses, balance },
        }
      }
      case 'debt_total': {
        const [rec, pay] = await Promise.all([
          this.prisma.debtRecord.aggregate({
            where: { companyId, type: 'RECEIVABLE', remainAmount: { gt: 0 } },
            _sum:  { remainAmount: true },
            _count: true,
          }),
          this.prisma.debtRecord.aggregate({
            where: { companyId, type: 'PAYABLE', remainAmount: { gt: 0 } },
            _sum:  { remainAmount: true },
            _count: true,
          }),
        ])
        const recAmt = Number(rec._sum.remainAmount ?? 0)
        const payAmt = Number(pay._sum.remainAmount ?? 0)
        return {
          answer: `Sizga qarzdorlar: ${rec._count} ta, jami ${recAmt.toLocaleString('uz-UZ')} so'm. Siz qarzdorsiz: ${pay._count} ta, jami ${payAmt.toLocaleString('uz-UZ')} so'm`,
          data: { receivable: recAmt, payable: payAmt },
        }
      }
      case 'low_stock': {
        const products = await this.prisma.product.findMany({
          where:   { companyId, isActive: true, isService: false, minStock: { gt: 0 } },
          include: { stockItems: { select: { quantity: true } } },
          take:    100,
        })
        const low = products.filter(p => {
          const total = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0)
          return total < Number(p.minStock)
        })
        if (low.length === 0) return { answer: 'Barcha mahsulotlar yetarli qoldiqda 👍' }
        const names = low.slice(0, 5).map(p => p.name).join(', ')
        return {
          answer: `${low.length} ta mahsulot kam qoldi: ${names}${low.length > 5 ? ' va boshqalar' : ''}`,
          data: { count: low.length },
        }
      }
      case 'top_products': {
        const grouped = await this.prisma.stockMovement.groupBy({
          by:    ['productId'],
          where: { warehouse: { companyId }, type: 'OUT', createdAt: { gte: monthAgo } },
          _sum:  { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take:    5,
        })
        if (grouped.length === 0) return { answer: 'Sotuv ma\'lumotlari yo\'q' }
        const products = await this.prisma.product.findMany({
          where:  { id: { in: grouped.map(g => g.productId) } },
          select: { id: true, name: true },
        })
        const map = new Map(products.map(p => [p.id, p.name]))
        const list = grouped.map(g => `${map.get(g.productId) ?? '?'} (${Number(g._sum.totalAmount).toLocaleString('uz-UZ')} so'm)`).join(', ')
        return { answer: `Top 5 mahsulot: ${list}` }
      }
      case 'top_customers': {
        const grouped = await this.prisma.stockMovement.groupBy({
          by:    ['contactId'],
          where: { warehouse: { companyId }, type: 'OUT', contactId: { not: null }, createdAt: { gte: monthAgo } },
          _sum:  { totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take:    5,
        })
        if (grouped.length === 0) return { answer: 'Mijoz ma\'lumotlari yo\'q' }
        const contacts = await this.prisma.contact.findMany({
          where:  { id: { in: grouped.map(g => g.contactId!).filter(Boolean) } },
          select: { id: true, name: true },
        })
        const map = new Map(contacts.map(c => [c.id, c.name]))
        const list = grouped.map(g => `${map.get(g.contactId!) ?? '?'} (${Number(g._sum.totalAmount).toLocaleString('uz-UZ')} so'm)`).join(', ')
        return { answer: `Top 5 mijoz: ${list}` }
      }
      default:
        return { answer: `Noma'lum so'rov: ${type}` }
    }
  }

  // ============================================
  // FIND_CONTACT — kontaktni topish
  // ============================================
  async findContact(companyId: string, name: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        companyId, isActive: true,
        name: { contains: name, mode: 'insensitive' },
      },
      select: { id: true, name: true, type: true, phone: true },
    })
    return contact
  }

  async findProduct(companyId: string, name: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        companyId, isActive: true,
        name: { contains: name, mode: 'insensitive' },
      },
      select: { id: true, name: true, code: true, unit: true, sellPrice: true },
    })
    return product
  }

  // ============================================
  // HELPER: Claude/Gemini javobidan JSON ajratish
  // ============================================
  private parseJson(raw: string): AssistantAction {
    try {
      // Code-block ichida bo'lsa
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) {
        return { action: 'unknown', message: 'JSON topilmadi: ' + raw.slice(0, 100) }
      }
      const parsed = JSON.parse(match[0])
      if (!parsed.action) parsed.action = 'unknown'
      return parsed
    } catch (e: any) {
      return { action: 'unknown', message: 'JSON noto\'g\'ri: ' + e?.message }
    }
  }
}
