import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const QQS_RATE = 0.12

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `INV-${year}-`
    const last = await this.prisma.billingInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    })
    const lastNum = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) : 0
    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
  }

  async createInvoice(params: {
    companyId: string
    subscriptionId: string
    subtotal: number
    discount?: number
    lineItems: any[]
    billingName?: string
    billingStir?: string
    billingAddress?: string
  }) {
    const discount = params.discount || 0
    const taxable = params.subtotal - discount
    const tax = Math.round(taxable * QQS_RATE)
    const total = taxable + tax
    const invoiceNumber = await this.generateInvoiceNumber()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    return this.prisma.billingInvoice.create({
      data: {
        companyId: params.companyId,
        subscriptionId: params.subscriptionId,
        invoiceNumber,
        subtotal: params.subtotal,
        discount,
        tax,
        total,
        status: 'PENDING',
        lineItems: params.lineItems as any,
        dueDate,
        billingName: params.billingName,
        billingStir: params.billingStir,
        billingAddress: params.billingAddress,
      },
    })
  }

  generateInvoiceHtml(invoice: any, company?: any): string {
    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : []
    const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' so\'m'
    const rows = items.map((i: any) => `
      <tr>
        <td>${i.description || ''}</td>
        <td style="text-align:right">${fmt(i.amount || 0)}</td>
      </tr>`).join('')

    return `<!DOCTYPE html>
<html lang="uz"><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title>
<style>
body{font-family:Arial,sans-serif;padding:40px;color:#0A0F1E}
h1{margin:0}
table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{padding:10px;border-bottom:1px solid #e5e7eb}
.total{font-weight:bold;font-size:18px}
.muted{color:#6b7280;font-size:13px}
</style></head><body>
<h1>Hisob-faktura ${invoice.invoiceNumber}</h1>
<p class="muted">Sana: ${new Date(invoice.issueDate).toLocaleDateString('uz-UZ')}</p>
<p><strong>Mijoz:</strong> ${invoice.billingName || company?.name || '-'}<br>
STIR: ${invoice.billingStir || company?.inn || '-'}<br>
Manzil: ${invoice.billingAddress || company?.address || '-'}</p>
<table><thead><tr><th>Tavsif</th><th style="text-align:right">Summa</th></tr></thead>
<tbody>${rows}
<tr><td>Summa</td><td style="text-align:right">${fmt(invoice.subtotal)}</td></tr>
<tr><td>Chegirma</td><td style="text-align:right">-${fmt(invoice.discount)}</td></tr>
<tr><td>QQS (12%)</td><td style="text-align:right">${fmt(invoice.tax)}</td></tr>
<tr class="total"><td>Jami</td><td style="text-align:right">${fmt(invoice.total)}</td></tr>
</tbody></table>
</body></html>`
  }
}
