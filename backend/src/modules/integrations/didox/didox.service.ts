import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import axios from 'axios'

const DIDOX_BASE = 'https://api.didox.uz/v1'

@Injectable()
export class DidoxService {
  private readonly logger = new Logger(DidoxService.name)

  constructor(private prisma: PrismaService) {}

  private async getHeaders(companyId: string): Promise<Record<string, string> | null> {
    const cfg = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId, type: 'DIDOX' } },
    })
    if (!cfg || !cfg.isActive) return null

    const { apiKey, clientId } = cfg.config as any
    return {
      'X-API-KEY':   apiKey,
      'X-CLIENT-ID': clientId,
      'Content-Type': 'application/json',
    }
  }

  async createInvoice(
    companyId: string,
    invoiceData: {
      invoiceNumber: string
      invoiceDate:   string
      sellerTin:     string
      buyerTin:      string
      buyerName:     string
      items: Array<{
        name:      string
        catalogCode: string
        barcode:   string
        quantity:  number
        unit:      string
        price:     number
        vatRate:   number
      }>
    },
  ): Promise<{ success: boolean; docId?: string; error?: string }> {
    const headers = await this.getHeaders(companyId)
    if (!headers) return { success: false, error: 'Didox integratsiyasi ulangan emas' }

    try {
      const products = invoiceData.items.map((item, i) => ({
        ordNo:         i + 1,
        name:          item.name,
        catalogCode:   item.catalogCode,
        barcode:       item.barcode,
        amount:        item.quantity,
        unitCode:      item.unit,
        unitPrice:     item.price,
        vatRate:       item.vatRate,
        vatSum:        (item.price * item.quantity * item.vatRate) / 100,
        deliverySum:   item.price * item.quantity,
        withoutVatSum: item.price * item.quantity,
      }))

      const totalSum      = products.reduce((s, p) => s + p.deliverySum, 0)
      const vatSum        = products.reduce((s, p) => s + p.vatSum,      0)
      const withoutVatSum = products.reduce((s, p) => s + p.withoutVatSum, 0)

      const body = {
        facturaDoc: {
          facturaNo:   invoiceData.invoiceNumber,
          facturaDate: invoiceData.invoiceDate,
          sellerTin:   invoiceData.sellerTin,
          buyerTin:    invoiceData.buyerTin,
          buyerName:   invoiceData.buyerName,
          totalSum,
          vatSum,
          withoutVatSum,
          productList: { products },
        },
      }

      const resp = await axios.post(`${DIDOX_BASE}/create-invoice`, body, { headers })

      await this.prisma.integrationConfig.update({
        where: { companyId_type: { companyId, type: 'DIDOX' } },
        data: { lastSyncAt: new Date() },
      })

      return { success: true, docId: resp.data?.docId }
    } catch (err: any) {
      const error = err?.response?.data?.message || err.message
      this.logger.error(`Didox invoice yaratishda xatolik: ${error}`)
      return { success: false, error }
    }
  }

  async getInvoiceStatus(
    companyId: string,
    docId: string,
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    const headers = await this.getHeaders(companyId)
    if (!headers) return { success: false, error: 'Didox integratsiyasi ulangan emas' }

    try {
      const resp = await axios.get(`${DIDOX_BASE}/invoice/${docId}`, { headers })
      return { success: true, status: resp.data?.status }
    } catch (err: any) {
      const error = err?.response?.data?.message || err.message
      return { success: false, error }
    }
  }

  async getInvoices(
    companyId: string,
    params: { page?: number; limit?: number; status?: string },
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const headers = await this.getHeaders(companyId)
    if (!headers) return { success: false, error: 'Didox integratsiyasi ulangan emas' }

    try {
      const resp = await axios.get(`${DIDOX_BASE}/invoices`, {
        headers,
        params: {
          page:  params.page  || 1,
          limit: params.limit || 20,
          ...(params.status && { status: params.status }),
        },
      })
      return { success: true, data: resp.data?.items || [] }
    } catch (err: any) {
      const error = err?.response?.data?.message || err.message
      return { success: false, error }
    }
  }

  async testConnection(companyId: string): Promise<{ ok: boolean; error?: string }> {
    const headers = await this.getHeaders(companyId)
    if (!headers) return { ok: false, error: 'Konfiguratsiya topilmadi' }

    try {
      await axios.get(`${DIDOX_BASE}/ping`, { headers })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message }
    }
  }
}
