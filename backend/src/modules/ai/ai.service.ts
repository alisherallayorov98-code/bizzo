import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import Anthropic from '@anthropic-ai/sdk'

export interface AIRecommendation {
  type:    'warning' | 'info' | 'success' | 'danger'
  title:   string
  message: string
  action?: string
  link?:   string
}

@Injectable()
export class AiService {
  private client: Anthropic | null

  constructor(private prisma: PrismaService) {
    this.client = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null
  }

  // ============================================
  // KOMPANIYA MA'LUMOTLARINI YIG'ISH
  // ============================================
  private async gatherCompanyData(companyId: string) {
    const now       = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [
      company,
      contactsCount,
      productsCount,
      lowStockProducts,
      totalDebtReceivable,
      totalDebtPayable,
      overdueDebts,
      thisMonthSales,
      lastMonthSales,
      unpaidSalaries,
      activeEmployees,
      wasteStats,
    ] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),

      this.prisma.contact.count({ where: { companyId, isActive: true } }),

      this.prisma.product.count({ where: { companyId, isActive: true } }),

      this.prisma.product.findMany({
        where:   { companyId, isActive: true, isService: false, minStock: { gt: 0 } },
        include: { stockItems: true },
      }).then(products =>
        products
          .filter(p => {
            const total = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0)
            return total <= Number(p.minStock)
          })
          .map(p => ({
            name:     p.name,
            unit:     p.unit,
            current:  p.stockItems.reduce((s, i) => s + Number(i.quantity), 0),
            minStock: Number(p.minStock),
          })),
      ),

      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'RECEIVABLE', remainAmount: { gt: 0 } },
        _sum:  { remainAmount: true },
      }).then(r => Number(r._sum.remainAmount || 0)),

      this.prisma.debtRecord.aggregate({
        where: { contact: { companyId }, type: 'PAYABLE', remainAmount: { gt: 0 } },
        _sum:  { remainAmount: true },
      }).then(r => Number(r._sum.remainAmount || 0)),

      this.prisma.debtRecord.count({
        where: { contact: { companyId }, remainAmount: { gt: 0 }, dueDate: { lt: now } },
      }),

      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: thisMonth } },
        _sum:   { finalAmount: true },
        _count: true,
      }).then(r => ({ amount: Number(r._sum.finalAmount || 0), count: r._count }))
        .catch(() => ({ amount: 0, count: 0 })),

      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: lastMonth, lt: thisMonth } },
        _sum:  { finalAmount: true },
      }).then(r => Number(r._sum.finalAmount || 0)).catch(() => 0),

      this.prisma.salaryRecord.aggregate({
        where: { employee: { companyId }, isPaid: false },
        _sum:   { totalAmount: true },
        _count: true,
      }).then(r => ({ amount: Number(r._sum.totalAmount || 0), count: r._count })),

      this.prisma.employee.count({ where: { companyId, isActive: true } }),

      this.prisma.wasteProcessing.aggregate({
        where:  { companyId, processedAt: { gte: thisMonth } },
        _avg:   { lossPercent: true },
        _count: true,
      }).catch(() => ({ _avg: { lossPercent: null }, _count: 0 })),
    ])

    const salesGrowth = lastMonthSales > 0
      ? (((thisMonthSales.amount - lastMonthSales) / lastMonthSales) * 100).toFixed(1)
      : null

    return {
      companyName:  company?.name || 'Kompaniya',
      currentDate:  now.toLocaleDateString('uz-UZ'),
      currentMonth: now.toLocaleString('uz-UZ', { month: 'long', year: 'numeric' }),

      contacts: { total: contactsCount },
      products: { total: productsCount },
      lowStockProducts,

      debts: {
        receivable:   totalDebtReceivable,
        payable:      totalDebtPayable,
        netBalance:   totalDebtReceivable - totalDebtPayable,
        overdueCount: overdueDebts,
      },

      sales: {
        thisMonth:  thisMonthSales,
        lastMonth:  lastMonthSales,
        growthRate: salesGrowth ? `${salesGrowth}%` : null,
      },

      employees: {
        total:        activeEmployees,
        unpaidSalary: unpaidSalaries,
      },

      waste: {
        monthlyProcessed: wasteStats._count,
        avgLossPercent:   wasteStats._avg.lossPercent
          ? Number(wasteStats._avg.lossPercent.toFixed(1))
          : null,
      },
    }
  }

  // ============================================
  // NATURAL TIL SO'ROVI
  // ============================================
  async query(companyId: string, userQuestion: string): Promise<string> {
    if (!this.client) return 'AI sozlanmagan (ANTHROPIC_API_KEY yo\'q)'
    const data = await this.gatherCompanyData(companyId)

    const systemPrompt = `Sen BIZZO ERP platformasining aqlli yordamchisissan.
Sening vazifang — biznes ma'lumotlarini tahlil qilib, aniq va foydali javob berish.

Hozirgi kompaniya ma'lumotlari (${data.currentDate}):
${JSON.stringify(data, null, 2)}

Qoidalar:
1. Faqat o'zbek tilida javob ber
2. Raqamlarni formatlash: 1,500,000 so'm
3. Qisqa va aniq javob ber (max 3-4 gap)
4. Tavsiya bersang — konkret va amaliy bo'lsin
5. Agar ma'lumot yetarli bo'lmasa — ochiq ayt`

    const response = await this.client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system:     systemPrompt,
      messages: [{
        role:    'user',
        content: userQuestion,
      }],
    })

    return (response.content[0] as any).text
  }

  // ============================================
  // AVTOMATIK TAVSIYALAR
  // ============================================
  async getRecommendations(companyId: string): Promise<AIRecommendation[]> {
    const data            = await this.gatherCompanyData(companyId)
    const recommendations: AIRecommendation[] = []

    if (data.lowStockProducts.length > 0) {
      recommendations.push({
        type:    'warning',
        title:   `${data.lowStockProducts.length} ta mahsulot kam qoldi`,
        message: data.lowStockProducts
          .slice(0, 3)
          .map(p => `${p.name}: ${p.current}/${p.minStock} ${p.unit}`)
          .join(', '),
        action: "Omborga o'tish",
        link:   '/warehouse',
      })
    }

    if (data.debts.overdueCount > 0) {
      recommendations.push({
        type:    'danger',
        title:   `${data.debts.overdueCount} ta qarz muddati o'tdi`,
        message: `Jami ${new Intl.NumberFormat('uz-UZ').format(data.debts.receivable)} so'm debitor qarz bor`,
        action:  "Qarzlarni ko'rish",
        link:    '/debts',
      })
    }

    if (data.employees.unpaidSalary.count > 0) {
      recommendations.push({
        type:    'warning',
        title:   `${data.employees.unpaidSalary.count} xodimga ish haqi to'lanmagan`,
        message: `Jami: ${new Intl.NumberFormat('uz-UZ').format(data.employees.unpaidSalary.amount)} so'm`,
        action:  "Ish haqiga o'tish",
        link:    '/salary',
      })
    }

    if (data.sales.growthRate) {
      const rate = parseFloat(data.sales.growthRate)
      if (rate > 10) {
        recommendations.push({
          type:    'success',
          title:   `Sotuv ${data.sales.growthRate} o'sdi!`,
          message: `${data.currentMonth}: ${new Intl.NumberFormat('uz-UZ').format(data.sales.thisMonth.amount)} so'm`,
          action:  "Pipelineni ko'rish",
          link:    '/modules/sales',
        })
      } else if (rate < -10) {
        recommendations.push({
          type:    'danger',
          title:   `Sotuv ${Math.abs(rate)}% pasaydi`,
          message: "O'tgan oyga nisbatan savdo pasaymoqda",
          action:  "Pipelineni ko'rish",
          link:    '/modules/sales',
        })
      }
    }

    if (data.waste.avgLossPercent && data.waste.avgLossPercent > 40) {
      recommendations.push({
        type:    'warning',
        title:   `Chiqindi yo'qotishi yuqori: ${data.waste.avgLossPercent}%`,
        message: "Bu oy o'rtacha yo'qotish normadan yuqori",
        action:  "Tahlilga o'tish",
        link:    '/modules/waste/analytics',
      })
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type:    'success',
        title:   'Hammasi yaxshi!',
        message: "Hozircha muhim ogohlantirishlar yo'q",
      })
    }

    return recommendations
  }

  // ============================================
  // DASHBOARD INSIGHTS
  // ============================================
  async getDashboardInsights(companyId: string) {
    const [data, recommendations] = await Promise.all([
      this.gatherCompanyData(companyId),
      this.getRecommendations(companyId),
    ])
    return { data, recommendations }
  }

  // ============================================
  // INVOYS RASMINI O'QISH (Claude Vision)
  // — yetkazib beruvchi qog'oz/PDF hisob-fakturasini fotoga olib jo'natadi
  // — Claude qatorlarni JSON ga o'giradi
  // ============================================
  async parseInvoiceImage(
    companyId: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<{
    supplier:    string | null
    docNumber:   string | null
    docDate:     string | null
    currency:    string
    lines: Array<{
      name:     string
      quantity: number
      unit:     string
      price:    number
      total:    number
    }>
    grandTotal:  number | null
    raw?:        string
  }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        supplier: null, docNumber: null, docDate: null, currency: 'UZS',
        lines: [], grandTotal: null,
        raw: 'AI sozlanmagan (ANTHROPIC_API_KEY yo\'q)',
      }
    }

    // Mavjud mahsulot nomlari bilan AI'ni yo'nlatamiz
    const products = await this.prisma.product.findMany({
      where:  { companyId, isActive: true },
      select: { name: true, code: true, unit: true },
      take:   200,
    })
    const productHint = products.map(p => `${p.code ? p.code + ' — ' : ''}${p.name} (${p.unit})`).join('\n')

    const prompt = `Sen yetkazib beruvchi invoyslarini o'qiy oladigan yordamchisan.
Berilgan invoys rasmidan QUYIDAGI JSON formatida ma'lumot ajratib ber:

{
  "supplier":    "yetkazib beruvchi nomi yoki null",
  "docNumber":   "hujjat raqami yoki null",
  "docDate":     "YYYY-MM-DD yoki null",
  "currency":    "UZS / USD / EUR",
  "lines": [
    { "name": "mahsulot nomi", "quantity": 12.5, "unit": "kg|dona|...", "price": 15000, "total": 187500 }
  ],
  "grandTotal":  123456 yoki null
}

Bizning bazadagi mavjud mahsulotlar (mos kelishi uchun):
${productHint || '(bazada mahsulotlar yo\'q)'}

Faqat JSON qaytar, izoh qo'shma. Agar rasm noaniq bo'lsa, lines bo'sh massiv qaytar.`

    try {
      if (!this.client) throw new Error('Claude not configured')
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type:       'base64',
                  media_type: mimeType as any,
                  data:       imageBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })

      const text = (response.content[0] as any)?.text ?? ''
      // Claude javobida JSON code-block bo'lishi mumkin — tozalaymiz
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { supplier: null, docNumber: null, docDate: null, currency: 'UZS', lines: [], grandTotal: null, raw: text }
      }

      const parsed = JSON.parse(jsonMatch[0])
      return {
        supplier:    parsed.supplier  ?? null,
        docNumber:   parsed.docNumber ?? null,
        docDate:     parsed.docDate   ?? null,
        currency:    parsed.currency  ?? 'UZS',
        lines:       Array.isArray(parsed.lines) ? parsed.lines.map((l: any) => ({
          name:     String(l.name ?? ''),
          quantity: Number(l.quantity ?? 0),
          unit:     String(l.unit ?? ''),
          price:    Number(l.price ?? 0),
          total:    Number(l.total ?? 0),
        })) : [],
        grandTotal:  parsed.grandTotal ?? null,
      }
    } catch (e: any) {
      return {
        supplier: null, docNumber: null, docDate: null, currency: 'UZS',
        lines: [], grandTotal: null,
        raw: `AI xatolik: ${e?.message ?? e}`,
      }
    }
  }
}
