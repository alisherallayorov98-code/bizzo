import { Injectable, Logger } from '@nestjs/common'
import { Cron }              from '@nestjs/schedule'
import { PrismaService }     from '../../prisma/prisma.service'
import axios                 from 'axios'

export interface ExchangeRates {
  USD: number
  EUR: number
  RUB: number
  date: string
  source: 'CBU' | 'MANUAL'
}

const CBU_API = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/'

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name)

  constructor(private prisma: PrismaService) {}

  // ─── CBU dan kurslarni yuklash ────────────────────────────────────────────

  async fetchFromCBU(): Promise<ExchangeRates | null> {
    try {
      const { data } = await axios.get(CBU_API, { timeout: 8000 })
      const rates: ExchangeRates = { USD: 0, EUR: 0, RUB: 0, date: new Date().toISOString(), source: 'CBU' }

      for (const item of data) {
        const code = item.Ccy?.toUpperCase()
        const rate = parseFloat(item.Rate?.replace(',', '.') ?? '0')
        if (code === 'USD') rates.USD = rate
        if (code === 'EUR') rates.EUR = rate
        if (code === 'RUB') rates.RUB = rate
      }

      return rates
    } catch (e) {
      this.logger.warn('CBU API xatolik: ' + (e as Error).message)
      return null
    }
  }

  // ─── Har kuni 08:00 yangilash ─────────────────────────────────────────────

  @Cron('0 8 * * *')
  async autoUpdateRates() {
    const rates = await this.fetchFromCBU()
    if (!rates) return

    // Barcha kompaniyalar uchun (yoki global) saqlash
    // ExchangeRate model bo'lmaganida JSON konfiguratsiya sifatida saqlash
    this.logger.log(`CBU kurslar yangilandi: USD=${rates.USD}, EUR=${rates.EUR}, RUB=${rates.RUB}`)

    // Global (companyId=null) sifatida yagona yozuv saqlaymiz
    await this.prisma.integrationConfig.upsert({
      where:  { companyId_type: { companyId: 'GLOBAL', type: 'EXCHANGE_RATES' } },
      create: { companyId: 'GLOBAL', type: 'EXCHANGE_RATES', isActive: true, config: rates as any },
      update: { config: rates as any, updatedAt: new Date() },
    }).catch(() => null)
  }

  // ─── Joriy kurslarni olish ────────────────────────────────────────────────

  async getCurrentRates(companyId?: string): Promise<ExchangeRates> {
    const DEFAULT: ExchangeRates = { USD: 12750, EUR: 13900, RUB: 142, date: new Date().toISOString(), source: 'CBU' }

    // 1. Kompaniya manual kurslari
    if (companyId) {
      const manual = await this.prisma.integrationConfig.findUnique({
        where: { companyId_type: { companyId, type: 'EXCHANGE_RATES' } },
      }).catch(() => null)
      if (manual?.isActive && manual.config) return manual.config as any
    }

    // 2. Global CBU kurslari
    const global = await this.prisma.integrationConfig.findUnique({
      where: { companyId_type: { companyId: 'GLOBAL', type: 'EXCHANGE_RATES' } },
    }).catch(() => null)
    if (global?.config) return global.config as any

    // 3. CBU dan yuklash
    const fresh = await this.fetchFromCBU()
    return fresh ?? DEFAULT
  }

  // ─── Manual kurslarni saqlash ─────────────────────────────────────────────

  async saveManualRates(companyId: string, rates: Partial<ExchangeRates>) {
    const current = await this.getCurrentRates(companyId)
    const updated: ExchangeRates = {
      ...current,
      ...rates,
      source: 'MANUAL',
      date:   new Date().toISOString(),
    }
    await this.prisma.integrationConfig.upsert({
      where:  { companyId_type: { companyId, type: 'EXCHANGE_RATES' } },
      create: { companyId, type: 'EXCHANGE_RATES', isActive: true, config: updated as any },
      update: { config: updated as any, isActive: true },
    })
    return updated
  }

  // ─── Convert ─────────────────────────────────────────────────────────────

  async convert(amount: number, from: string, to: string, companyId?: string): Promise<number> {
    if (from === to) return amount
    const rates = await this.getCurrentRates(companyId)

    const toUZS = (n: number, currency: string) => {
      if (currency === 'UZS') return n
      if (currency === 'USD') return n * rates.USD
      if (currency === 'EUR') return n * rates.EUR
      if (currency === 'RUB') return n * rates.RUB
      return n
    }
    const fromUZS = (n: number, currency: string) => {
      if (currency === 'UZS') return n
      if (currency === 'USD') return n / rates.USD
      if (currency === 'EUR') return n / rates.EUR
      if (currency === 'RUB') return n / rates.RUB
      return n
    }

    return fromUZS(toUZS(amount, from), to)
  }
}
