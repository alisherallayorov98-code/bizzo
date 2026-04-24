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

      // 5. Levenshtein fuzzy (55%)
      const fuzzy = await this.findContactFuzzy(companyId, data.name, 0.82)
      if (fuzzy) return { ...fuzzy, confidence: 55, matchedBy: 'name_fuzzy' }
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

      // Levenshtein fuzzy (70%)
      const fuzzy = await this.findProductFuzzy(companyId, data.name, 0.82)
      if (fuzzy) return { ...fuzzy, confidence: 70, matchedBy: 'name_fuzzy' }
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

  // Levenshtein distance for fuzzy name matching
  levenshteinDistance(a: string, b: string): number {
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    )
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
      }
    }
    return dp[m][n]
  }

  nameSimilarity(a: string, b: string): number {
    const na = this.normalizeName(a), nb = this.normalizeName(b)
    if (!na || !nb) return 0
    const dist = this.levenshteinDistance(na, nb)
    return 1 - dist / Math.max(na.length, nb.length)
  }

  // Batch fuzzy find — returns best match above threshold
  async findContactFuzzy(companyId: string, name: string, threshold = 0.82): Promise<DedupMatch | null> {
    const contacts = await this.prisma.contact.findMany({
      where: { companyId },
      select: { id: true, name: true },
    })
    let best: { id: string; sim: number } | null = null
    for (const c of contacts) {
      const sim = this.nameSimilarity(name, c.name)
      if (sim >= threshold && (!best || sim > best.sim)) {
        best = { id: c.id, sim }
      }
    }
    if (best) return { internalId: best.id, confidence: Math.round(best.sim * 100), matchedBy: 'name_fuzzy' }
    return null
  }

  async findProductFuzzy(companyId: string, name: string, threshold = 0.82): Promise<DedupMatch | null> {
    const products = await this.prisma.product.findMany({
      where: { companyId },
      select: { id: true, name: true },
    })
    let best: { id: string; sim: number } | null = null
    for (const p of products) {
      const sim = this.nameSimilarity(name, p.name)
      if (sim >= threshold && (!best || sim > best.sim)) {
        best = { id: p.id, sim }
      }
    }
    if (best) return { internalId: best.id, confidence: Math.round(best.sim * 100), matchedBy: 'name_fuzzy' }
    return null
  }
}
