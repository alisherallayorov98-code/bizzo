import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SalesForecastService {
  constructor(private prisma: PrismaService) {}

  async setTarget(companyId: string, dto: {
    userId?:      string
    period:       string
    periodType?:  string
    targetAmount: number
    notes?:       string
  }) {
    return this.prisma.salesTarget.upsert({
      where: {
        companyId_userId_period: {
          companyId,
          userId: dto.userId ?? null,
          period: dto.period,
        },
      },
      update: { targetAmount: dto.targetAmount, notes: dto.notes, periodType: dto.periodType ?? 'MONTH' },
      create: {
        companyId,
        userId:       dto.userId,
        period:       dto.period,
        periodType:   dto.periodType ?? 'MONTH',
        targetAmount: dto.targetAmount,
        notes:        dto.notes,
      },
    })
  }

  async getTargets(companyId: string, period: string) {
    return this.prisma.salesTarget.findMany({
      where:   { companyId, period },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    })
  }

  async getForecastData(companyId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0')
      return `${year}-${m}`
    })

    const results = await Promise.all(months.map(async month => {
      const from = new Date(`${month}-01`)
      const to   = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59)

      // Company-wide target for this month
      const target = await this.prisma.salesTarget.findFirst({
        where: { companyId, userId: null, period: month },
      })

      // WON deals closed in this month
      const wonDeals = await this.prisma.deal.findMany({
        where: { companyId, stage: 'WON', closedAt: { gte: from, lte: to } },
        select: { finalAmount: true },
      })
      const actual = wonDeals.reduce((s, d) => s + Number(d.finalAmount), 0)

      // LOST deals in month
      const lostDeals = await this.prisma.deal.count({
        where: { companyId, stage: 'LOST', closedAt: { gte: from, lte: to } },
      })
      const dealsWon = wonDeals.length

      // Active pipeline value * probability
      const pipeline = await this.prisma.deal.findMany({
        where: {
          companyId,
          isActive: true,
          stage: { notIn: ['WON', 'LOST'] },
          expectedCloseDate: { gte: from, lte: to },
        },
        select: { finalAmount: true, probability: true },
      })
      const pipelineValue = pipeline.reduce((s, d) => s + Number(d.finalAmount) * (d.probability / 100), 0)

      const total = dealsWon + lostDeals
      const winRate = total > 0 ? Math.round((dealsWon / total) * 100) : 0

      return {
        month,
        target:    Number(target?.targetAmount ?? 0),
        actual,
        pipeline:  Math.round(pipelineValue),
        dealsWon,
        dealsLost: lostDeals,
        winRate,
      }
    }))

    return results
  }

  async getSalespersonKPI(companyId: string, period: string) {
    const from = new Date(`${period}-01`)
    const to   = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59)

    // Get all salespeople who have deals
    const salespeople = await this.prisma.user.findMany({
      where:  { companyId, isActive: true },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    })

    const kpis = await Promise.all(salespeople.map(async user => {
      const target = await this.prisma.salesTarget.findFirst({
        where: { companyId, userId: user.id, period },
      })

      const wonDeals = await this.prisma.deal.findMany({
        where: { companyId, assignedToId: user.id, stage: 'WON', closedAt: { gte: from, lte: to } },
        select: { finalAmount: true },
      })
      const lostCount = await this.prisma.deal.count({
        where: { companyId, assignedToId: user.id, stage: 'LOST', closedAt: { gte: from, lte: to } },
      })

      const actual   = wonDeals.reduce((s, d) => s + Number(d.finalAmount), 0)
      const dealsWon = wonDeals.length
      const total    = dealsWon + lostCount
      const winRate  = total > 0 ? Math.round((dealsWon / total) * 100) : 0
      const targetAmt = Number(target?.targetAmount ?? 0)

      return {
        user,
        target:    targetAmt,
        actual,
        dealsWon,
        dealsLost: lostCount,
        winRate,
        progress:  targetAmt > 0 ? Math.round((actual / targetAmt) * 100) : 0,
      }
    }))

    // Only return users with activity or target
    return kpis.filter(k => k.actual > 0 || k.target > 0 || k.dealsWon > 0)
  }
}
