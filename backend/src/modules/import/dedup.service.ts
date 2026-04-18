import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface DedupMatch {
  internalId: string
  confidence: number  // 0-100
  matchedBy:  string  // 'stir' | 'phone' | 'name' | 'email'
}

@Injectable()
export class DedupService {
  constructor(private prisma: PrismaService) {}

  // Kontakt uchun takror tekshirish
  async findContactMatch(companyId: string, data: {
    name?: string; phone?: string; stir?: string; email?: string
  }): Promise<DedupMatch | null> {
    // 1. STIR bo'yicha (100% aniq)
    if (data.stir) {
      const found = await this.prisma.contact.findFirst({
        where: { companyId, stir: data.stir },
        select: { id: true },
      })
      if (found) return { internalId: found.id, confidence: 100, matchedBy: 'stir' }
    }

    // 2. Telefon bo'yicha (95% aniq)
    if (data.phone) {
      const normalizedPhone = this.normalizePhone(data.phone)
      const contacts = await this.prisma.contact.findMany({
        where: { companyId },
        select: { id: true, phone: true },
      })
      const match = contacts.find(c =>
        c.phone && this.normalizePhone(c.phone) === normalizedPhone
      )
      if (match) return { internalId: match.id, confidence: 95, matchedBy: 'phone' }
    }

    // 3. Ism bo'yicha (80% ehtimol)
    if (data.name) {
      const normalizedName = this.normalizeName(data.name)
      const contacts = await this.prisma.contact.findMany({
        where: { companyId },
        select: { id: true, name: true },
      })
      const match = contacts.find(c =>
        this.normalizeName(c.name) === normalizedName
      )
      if (match) return { internalId: match.id, confidence: 80, matchedBy: 'name' }

      // 4. Qisman ism moslashtirish (60%)
      const partial = contacts.find(c => {
        const a = normalizedName.split(' ')
        const b = this.normalizeName(c.name).split(' ')
        return a.some(w => w.length > 3 && b.includes(w))
      })
      if (partial) return { internalId: partial.id, confidence: 60, matchedBy: 'name_partial' }
    }

    return null
  }

  // Mahsulot uchun takror tekshirish
  async findProductMatch(companyId: string, data: {
    name?: string; code?: string; barcode?: string
  }): Promise<DedupMatch | null> {
    if (data.barcode) {
      const found = await this.prisma.product.findFirst({
        where: { companyId, barcode: data.barcode },
        select: { id: true },
      })
      if (found) return { internalId: found.id, confidence: 100, matchedBy: 'barcode' }
    }

    if (data.code) {
      const found = await this.prisma.product.findFirst({
        where: { companyId, code: data.code },
        select: { id: true },
      })
      if (found) return { internalId: found.id, confidence: 98, matchedBy: 'code' }
    }

    if (data.name) {
      const normalizedName = this.normalizeName(data.name)
      const products = await this.prisma.product.findMany({
        where: { companyId },
        select: { id: true, name: true },
      })
      const match = products.find(p =>
        this.normalizeName(p.name) === normalizedName
      )
      if (match) return { internalId: match.id, confidence: 85, matchedBy: 'name' }
    }

    return null
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^998/, '').slice(-9)
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/['"«»]/g, '')
      .replace(/\b(mchj|ooo|ao|xk|llc|ltd|ооо|мчж)\b/gi, '')
      .trim()
  }
}
