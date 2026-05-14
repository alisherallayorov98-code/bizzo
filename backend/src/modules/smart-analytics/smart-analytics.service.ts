import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================
// TYPES
// ============================================================
export interface HealthScore {
  total: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    revenue:      { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    debt:         { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    stock:        { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    employees:    { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    cashflow:     { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    construction: { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
    production:   { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' };
  };
  insight: string;
}

export interface ABCProduct {
  id: string; name: string; unit: string;
  revenue: number; revenueShare: number; cumulativeShare: number;
  category: 'A' | 'B' | 'C';
  totalStock: number; sellPrice: number;
}

export interface RFMContact {
  id: string; name: string; type: string;
  recencyDays: number; frequency: number; monetary: number;
  rScore: number; fScore: number; mScore: number;
  rfmScore: number;
  segment: 'Champions' | 'Loyal' | 'Potential' | 'AtRisk' | 'Lost' | 'New';
  segmentUz: string;
}

export interface SalesForecast {
  month: string;
  predicted: number;
  confidence: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  history: { month: string; actual: number }[];
}

export interface StockDepletion {
  productId: string; name: string; unit: string;
  currentStock: number; avgDailyConsumption: number;
  daysUntilEmpty: number | null;
  depletionDate: string | null;
  urgency: 'critical' | 'warning' | 'ok';
}

export interface Anomaly {
  type: 'revenue_drop' | 'expense_spike' | 'debt_surge' | 'stock_anomaly' | 'payment_delay';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value: number;
  expectedValue: number;
  deviationPct: number;
}

// ============================================================
// SERVICE
// ============================================================
@Injectable()
export class SmartAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------
  // HELPER: oylik sanalar
  // ----------------------------------------------------------
  private monthRange(offset: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
    return { start, end };
  }

  private monthLabel(offset: number) {
    const now = new Date();
    const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleString('uz-UZ', { month: 'short', year: 'numeric' });
  }

  // ----------------------------------------------------------
  // 1. BUSINESS HEALTH SCORE
  // ----------------------------------------------------------
  async getHealthScore(companyId: string): Promise<HealthScore> {
    const now        = new Date();
    const thisMonth  = this.monthRange(0);
    const lastMonth  = this.monthRange(-1);

    // Revenue
    const [thisRev, lastRev] = await Promise.all([
      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: thisMonth.start } },
        _sum: { finalAmount: true },
      }).then(r => Number(r._sum.finalAmount || 0)).catch(() => 0),
      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: lastMonth.start, lte: lastMonth.end } },
        _sum: { finalAmount: true },
      }).then(r => Number(r._sum.finalAmount || 0)).catch(() => 0),
    ]);

    const revGrowth = lastRev > 0 ? ((thisRev - lastRev) / lastRev) * 100 : 0;
    const revScore  = Math.min(20, Math.max(0,
      revGrowth > 20 ? 20 : revGrowth > 5 ? 18 : revGrowth > 0 ? 14 : revGrowth > -10 ? 10 : 5,
    ));

    // Debt health
    const [receivable, payable, overdueCount, totalDebts] = await Promise.all([
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'RECEIVABLE', remaining: { gt: 0 } },
        _sum: { remaining: true },
      }).then(r => Number(r._sum.remaining || 0)).catch(() => 0),
      this.prisma.debtRecord.aggregate({
        where: { companyId, type: 'PAYABLE', remaining: { gt: 0 } },
        _sum: { remaining: true },
      }).then(r => Number(r._sum.remaining || 0)).catch(() => 0),
      this.prisma.debtRecord.count({
        where: { companyId, remaining: { gt: 0 }, dueDate: { lt: now } },
      }).catch(() => 0),
      this.prisma.debtRecord.count({
        where: { companyId, remaining: { gt: 0 } },
      }).catch(() => 0),
    ]);
    const overdueRatio = totalDebts > 0 ? overdueCount / totalDebts : 0;
    const debtRatio    = (receivable + payable) > 0 ? payable / (receivable + payable) : 0.5;
    const debtScore    = Math.round(20 * (1 - overdueRatio * 0.5 - debtRatio * 0.3));

    // Stock health
    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, isService: false, minStock: { gt: 0 } },
      include: { stockItems: { select: { quantity: true } } },
    });
    const lowCount   = products.filter(p => {
      const total = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0);
      return total <= Number(p.minStock);
    }).length;
    const lowRatio   = products.length > 0 ? lowCount / products.length : 0;
    const stockScore = Math.round(15 * (1 - lowRatio));

    // Employees (unpaid salary)
    const [unpaid, totalEmployees] = await Promise.all([
      this.prisma.salaryRecord.count({
        where: { employee: { companyId }, isPaid: false },
      }).catch(() => 0),
      this.prisma.employee.count({ where: { companyId, isActive: true } }).catch(() => 0),
    ]);
    const unpaidRatio = totalEmployees > 0 ? unpaid / totalEmployees : 0;
    const empScore    = Math.round(15 * (1 - Math.min(1, unpaidRatio * 2)));

    // Cash flow (receivable - payable ratio)
    const netCash      = receivable - payable;
    const cashflowScore = netCash >= 0
      ? Math.min(15, 15)
      : Math.max(0, 15 + Math.round(netCash / (payable || 1) * 10));

    // Construction health
    const [totalProjects, overdueProjects, completedProjects] = await Promise.all([
      this.prisma.constructionProject.count({ where: { companyId, isActive: true, status: { in: ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'] } } }).catch(() => 0),
      this.prisma.constructionProject.count({ where: { companyId, isActive: true, status: 'IN_PROGRESS', endDate: { lt: now } } }).catch(() => 0),
      this.prisma.constructionProject.count({ where: { companyId, status: 'COMPLETED', actualEndDate: { gte: thisMonth.start } } }).catch(() => 0),
    ]);
    const overdueProjectRatio = totalProjects > 0 ? overdueProjects / totalProjects : 0;
    const constructionScore   = totalProjects === 0
      ? 8
      : Math.round(8 * (1 - Math.min(1, overdueProjectRatio)));
    const constructionTrend: 'up' | 'down' | 'stable' =
      overdueProjectRatio === 0 ? 'up' : overdueProjectRatio > 0.3 ? 'down' : 'stable';

    // Production health
    const [totalBatches, completedBatches, failedBatches] = await Promise.all([
      this.prisma.productionBatch.count({ where: { companyId, createdAt: { gte: thisMonth.start } } }).catch(() => 0),
      this.prisma.productionBatch.count({ where: { companyId, status: 'COMPLETED', actualEnd: { gte: thisMonth.start } } }).catch(() => 0),
      this.prisma.productionBatch.count({ where: { companyId, status: 'CANCELLED', updatedAt: { gte: thisMonth.start } } }).catch(() => 0),
    ]);
    const prodSuccessRate = totalBatches > 0 ? completedBatches / totalBatches : 1;
    const productionScore = totalBatches === 0
      ? 7
      : Math.round(7 * prodSuccessRate);
    const productionTrend: 'up' | 'down' | 'stable' =
      prodSuccessRate >= 0.9 ? 'up' : prodSuccessRate < 0.5 ? 'down' : 'stable';

    const total = Math.min(100, Math.max(0,
      revScore + debtScore + stockScore + empScore + cashflowScore + constructionScore + productionScore,
    ));

    const grade: HealthScore['grade'] =
      total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';

    const insights: Record<HealthScore['grade'], string> = {
      A: 'Biznes juda yaxshi holatda. Barcha ko\'rsatkichlar maqbul.',
      B: 'Biznes yaxshi, ayrim sohalarda yaxshilash imkoni bor.',
      C: 'O\'rtacha holat. Qarz va savdo ko\'rsatkichlariga e\'tibor bering.',
      D: 'Muammolar mavjud. Darhol chora ko\'rish tavsiya etiladi.',
      F: 'Kritik holat. Tezkor qarorlar zarur.',
    };

    return {
      total,
      grade,
      components: {
        revenue:      { score: revScore,          max: 20, label: 'Savdo o\'sishi',       trend: revGrowth > 2 ? 'up' : revGrowth < -2 ? 'down' : 'stable' },
        debt:         { score: debtScore,         max: 20, label: 'Qarz holati',          trend: overdueRatio < 0.1 ? 'up' : overdueRatio > 0.3 ? 'down' : 'stable' },
        stock:        { score: stockScore,        max: 15, label: 'Ombor holati',         trend: lowRatio < 0.1 ? 'up' : lowRatio > 0.3 ? 'down' : 'stable' },
        employees:    { score: empScore,          max: 15, label: 'Xodimlar',             trend: unpaidRatio < 0.1 ? 'up' : 'down' },
        cashflow:     { score: cashflowScore,     max: 15, label: 'Naqd pul oqimi',       trend: netCash > 0 ? 'up' : 'down' },
        construction: { score: constructionScore, max: 8,  label: 'Qurilish loyihalari',  trend: constructionTrend },
        production:   { score: productionScore,   max: 7,  label: 'Ishlab chiqarish',     trend: productionTrend },
      },
      insight: insights[grade],
    };
  }

  // ----------------------------------------------------------
  // 2. ABC TAHLIL (mahsulotlar)
  // ----------------------------------------------------------
  async getABCAnalysis(companyId: string): Promise<ABCProduct[]> {
    // Sales-based ABC: deal items yoki stock movements bo'yicha
    const movements = await this.prisma.stockMovement.findMany({
      where:   { warehouse: { companyId }, type: 'OUT' },
      select:  { productId: true, quantity: true, totalAmount: true },
    }).catch(() => [] as any[]);

    // Revenue per product
    const revenueMap: Record<string, number> = {};
    movements.forEach((m: any) => {
      revenueMap[m.productId] = (revenueMap[m.productId] || 0) + Number(m.totalAmount || 0);
    });

    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true },
      include: { stockItems: { select: { quantity: true } } },
    });

    const totalRevenue = Object.values(revenueMap).reduce((a, b) => a + b, 0);

    const sorted = products
      .map(p => ({
        id:         p.id,
        name:       p.name,
        unit:       p.unit || 'dona',
        revenue:    revenueMap[p.id] || 0,
        totalStock: p.stockItems.reduce((s, i) => s + Number(i.quantity), 0),
        sellPrice:  Number(p.sellPrice),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    let cumulative = 0;
    return sorted.map(p => {
      const share = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
      cumulative += share;
      const category: 'A' | 'B' | 'C' = cumulative <= 80 ? 'A' : cumulative <= 95 ? 'B' : 'C';
      return { ...p, revenueShare: share, cumulativeShare: cumulative, category };
    });
  }

  // ----------------------------------------------------------
  // 3. RFM TAHLIL (mijozlar)
  // ----------------------------------------------------------
  async getRFMAnalysis(companyId: string): Promise<RFMContact[]> {
    const now = new Date();

    const contacts = await this.prisma.contact.findMany({
      where:   { companyId, isActive: true, type: 'CUSTOMER' },
      include: {
        debtRecords: {
          select: { type: true, amount: true, remaining: true, createdAt: true, dueDate: true },
        },
      },
    });

    if (contacts.length === 0) return [];

    // Compute R, F, M per contact
    const rfmRaw = contacts.map(c => {
      const records = c.debtRecords.filter(d => d.type === 'RECEIVABLE');
      const lastDate  = records.reduce((latest, d) =>
        d.createdAt > latest ? d.createdAt : latest, new Date(0));
      const recencyDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
      const frequency   = records.length;
      const monetary    = records.reduce((s, d) => s + Number(d.amount), 0);

      return {
        id: c.id, name: c.name, type: c.type,
        recencyDays, frequency, monetary,
      };
    });

    // Score 1-5 per metric (quantile-based)
    const rValues = rfmRaw.map(r => r.recencyDays).sort((a, b) => a - b);
    const fValues = rfmRaw.map(r => r.frequency).sort((a, b) => b - a);
    const mValues = rfmRaw.map(r => r.monetary).sort((a, b) => b - a);
    const n       = rfmRaw.length;

    const quantileScore = (arr: number[], val: number, reverse = false): number => {
      const rank = arr.filter(v => (reverse ? v <= val : v >= val)).length;
      const pct  = rank / n;
      if (pct <= 0.2) return 5;
      if (pct <= 0.4) return 4;
      if (pct <= 0.6) return 3;
      if (pct <= 0.8) return 2;
      return 1;
    };

    const segmentMap = (r: number, f: number, m: number): { segment: RFMContact['segment']; segmentUz: string } => {
      const avg = (r + f + m) / 3;
      if (r >= 4 && f >= 4 && m >= 4) return { segment: 'Champions', segmentUz: 'Eng yaxshi mijozlar' };
      if (r >= 3 && f >= 3)           return { segment: 'Loyal',      segmentUz: 'Sodiq mijozlar' };
      if (r >= 3 && f <= 2)           return { segment: 'Potential',  segmentUz: 'Potensial mijozlar' };
      if (r <= 2 && f >= 3)           return { segment: 'AtRisk',     segmentUz: 'Xavf ostidagi mijozlar' };
      if (r <= 2 && f <= 2 && m >= 3) return { segment: 'AtRisk',     segmentUz: 'Xavf ostidagi mijozlar' };
      if (f === 1 && r >= 4)          return { segment: 'New',        segmentUz: 'Yangi mijozlar' };
      if (avg <= 2)                   return { segment: 'Lost',       segmentUz: 'Yo\'qotilgan mijozlar' };
      return { segment: 'Potential', segmentUz: 'Potensial mijozlar' };
    };

    return rfmRaw.map(r => {
      const rScore = quantileScore(rValues, r.recencyDays, true); // lower recency = better
      const fScore = quantileScore(fValues, r.frequency);
      const mScore = quantileScore(mValues, r.monetary);
      const rfmScore = rScore * 100 + fScore * 10 + mScore;
      const { segment, segmentUz } = segmentMap(rScore, fScore, mScore);
      return { ...r, rScore, fScore, mScore, rfmScore, segment, segmentUz };
    }).sort((a, b) => b.rfmScore - a.rfmScore);
  }

  // ----------------------------------------------------------
  // 4. SAVDO BASHORATI
  // ----------------------------------------------------------
  async getSalesForecast(companyId: string): Promise<SalesForecast> {
    // Oxirgi 6 oy ma'lumot
    const history = await Promise.all(
      [-5, -4, -3, -2, -1, 0].map(async offset => {
        const { start, end } = this.monthRange(offset);
        const rev = await this.prisma.deal.aggregate({
          where: { companyId, stage: 'WON', closedAt: { gte: start, lte: end } },
          _sum:  { finalAmount: true },
        }).then(r => Number(r._sum.finalAmount || 0)).catch(() => 0);
        return { month: this.monthLabel(offset), actual: rev };
      }),
    );

    const values = history.map(h => h.actual);
    const n      = values.length;

    // Weighted moving average (keyingi oylar ko'proq og'irlik)
    const weights  = [1, 2, 3, 4, 5, 6];
    const wSum     = weights.reduce((a, b) => a + b, 0);
    const wma      = values.reduce((sum, v, i) => sum + v * weights[i], 0) / wSum;

    // Linear trend (least squares)
    const xMean    = (n - 1) / 2;
    const yMean    = values.reduce((a, b) => a + b, 0) / n;
    const slope    = values.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0) /
                     values.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);
    const intercept = yMean - slope * xMean;
    const trendPredicted = intercept + slope * n;

    // Blend WMA + trend
    const predicted = Math.max(0, Math.round(wma * 0.6 + trendPredicted * 0.4));

    // Confidence: based on coefficient of variation (lower CV = higher confidence)
    const stdDev     = Math.sqrt(values.reduce((s, v) => s + (v - yMean) ** 2, 0) / n);
    const cv         = yMean > 0 ? stdDev / yMean : 1;
    const confidence = Math.round(Math.max(20, Math.min(95, (1 - cv) * 100)));

    const lastActual = values[n - 1];
    const growthRate = lastActual > 0 ? ((predicted - lastActual) / lastActual) * 100 : 0;
    const trend      = growthRate > 3 ? 'up' : growthRate < -3 ? 'down' : 'stable';

    return {
      month:      this.monthLabel(1),
      predicted,
      confidence,
      trend,
      growthRate: Number(growthRate.toFixed(1)),
      history,
    };
  }

  // ----------------------------------------------------------
  // 5. STOCK TUGASH BASHORATI
  // ----------------------------------------------------------
  async getStockDepletion(companyId: string): Promise<StockDepletion[]> {
    const now      = new Date();
    const last30   = new Date(now.getTime() - 30 * 86400000);

    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, isService: false },
      include: { stockItems: { select: { quantity: true } } },
    });

    const outMovements = await this.prisma.stockMovement.findMany({
      where:   { warehouse: { companyId }, type: 'OUT', createdAt: { gte: last30 } },
      select:  { productId: true, quantity: true },
    }).catch(() => [] as any[]);

    const consumptionMap: Record<string, number> = {};
    outMovements.forEach((m: any) => {
      consumptionMap[m.productId] = (consumptionMap[m.productId] || 0) + Number(m.quantity);
    });

    return products
      .map(p => {
        const currentStock       = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0);
        const totalOut30         = consumptionMap[p.id] || 0;
        const avgDailyConsumption = Number((totalOut30 / 30).toFixed(2));

        let daysUntilEmpty: number | null = null;
        let depletionDate:  string | null = null;
        if (avgDailyConsumption > 0) {
          daysUntilEmpty = Math.floor(currentStock / avgDailyConsumption);
          const d = new Date(now.getTime() + daysUntilEmpty * 86400000);
          depletionDate  = d.toISOString().split('T')[0];
        }

        const urgency: StockDepletion['urgency'] =
          daysUntilEmpty !== null && daysUntilEmpty <= 7  ? 'critical' :
          daysUntilEmpty !== null && daysUntilEmpty <= 21 ? 'warning'  : 'ok';

        return {
          productId: p.id,
          name: p.name,
          unit: p.unit || 'dona',
          currentStock,
          avgDailyConsumption,
          daysUntilEmpty,
          depletionDate,
          urgency,
        };
      })
      .filter(p => p.avgDailyConsumption > 0)
      .sort((a, b) => (a.daysUntilEmpty ?? 999) - (b.daysUntilEmpty ?? 999));
  }

  // ----------------------------------------------------------
  // 6. ANOMALIYA ANIQLASH
  // ----------------------------------------------------------
  async getAnomalies(companyId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Oxirgi 3 oy revenue
    const months = await Promise.all(
      [-3, -2, -1, 0].map(async o => {
        const { start, end } = this.monthRange(o);
        return this.prisma.deal.aggregate({
          where: { companyId, stage: 'WON', closedAt: { gte: start, lte: end } },
          _sum:  { finalAmount: true },
        }).then(r => Number(r._sum.finalAmount || 0)).catch(() => 0);
      }),
    );

    const avg3 = (months[0] + months[1] + months[2]) / 3;
    const current = months[3];

    if (avg3 > 0 && current < avg3 * 0.6) {
      anomalies.push({
        type:         'revenue_drop',
        severity:     current < avg3 * 0.3 ? 'high' : 'medium',
        title:        'Savdo keskin tushdi',
        description:  `Bu oy savdo o'rtachadan ${Math.round((1 - current / avg3) * 100)}% past`,
        value:        current,
        expectedValue: avg3,
        deviationPct: Number(((avg3 - current) / avg3 * 100).toFixed(1)),
      });
    }

    // Muddati o'tgan qarzlar ortdi?
    const [overdueNow, overdueLast] = await Promise.all([
      this.prisma.debtRecord.aggregate({
        where: { companyId, remaining: { gt: 0 }, dueDate: { lt: new Date() } },
        _sum:  { remaining: true },
        _count: true,
      }).catch(() => ({ _sum: { remaining: null }, _count: 0 })),
      this.prisma.debtRecord.aggregate({
        where: {
          companyId,
          remaining: { gt: 0 },
          dueDate:    { lt: new Date(Date.now() - 30 * 86400000) },
        },
        _sum:  { remaining: true },
        _count: true,
      }).catch(() => ({ _sum: { remaining: null }, _count: 0 })),
    ]);

    const overdueNowAmt  = Number(overdueNow._sum.remaining  || 0);
    const overdueLastAmt = Number(overdueLast._sum.remaining || 0);
    if (overdueNowAmt > 0 && overdueNowAmt > overdueLastAmt * 1.5) {
      anomalies.push({
        type:         'debt_surge',
        severity:     overdueNow._count > 5 ? 'high' : 'medium',
        title:        'Muddati o\'tgan qarzlar oshdi',
        description:  `${overdueNow._count} ta qarz muddati o'tgan`,
        value:        overdueNowAmt,
        expectedValue: overdueLastAmt,
        deviationPct: Number(((overdueNowAmt - overdueLastAmt) / Math.max(overdueLastAmt, 1) * 100).toFixed(1)),
      });
    }

    // Ko'p mahsulot kamaydi
    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, isService: false },
      include: { stockItems: { select: { quantity: true } } },
    });
    const criticalLow = products.filter(p => {
      const stock = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0);
      return stock === 0;
    });
    if (criticalLow.length >= 3) {
      anomalies.push({
        type:         'stock_anomaly',
        severity:     criticalLow.length >= 5 ? 'high' : 'medium',
        title:        `${criticalLow.length} ta mahsulot tugab qoldi`,
        description:  criticalLow.slice(0, 3).map(p => p.name).join(', ') + (criticalLow.length > 3 ? '...' : ''),
        value:        criticalLow.length,
        expectedValue: 0,
        deviationPct: 100,
      });
    }

    return anomalies;
  }

  // ----------------------------------------------------------
  // 7. MORNING DIGEST (kunlik xulosa)
  // ----------------------------------------------------------
  async getMorningDigest(companyId: string) {
    const [health, forecast, anomalies, depletion] = await Promise.all([
      this.getHealthScore(companyId),
      this.getSalesForecast(companyId),
      this.getAnomalies(companyId),
      this.getStockDepletion(companyId),
    ]);

    const today = new Date().toLocaleDateString('uz-UZ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const criticalItems: string[] = [];
    anomalies.filter(a => a.severity === 'high').forEach(a => criticalItems.push(a.title));
    depletion.filter(d => d.urgency === 'critical').forEach(d =>
      criticalItems.push(`${d.name}: ${d.daysUntilEmpty} kunga yetadi`),
    );

    return {
      date:         today,
      healthScore:  health.total,
      healthGrade:  health.grade,
      healthInsight: health.insight,
      forecast: {
        nextMonth:  forecast.month,
        predicted:  forecast.predicted,
        trend:      forecast.trend,
        growthRate: forecast.growthRate,
      },
      criticalItems,
      anomalyCount:  anomalies.length,
      criticalCount: anomalies.filter(a => a.severity === 'high').length,
      depletionCount: depletion.filter(d => d.urgency !== 'ok').length,
      topAnomalies:  anomalies.slice(0, 3),
    };
  }

  // ----------------------------------------------------------
  // 8. SMART TRIGGERS (ogohlantirishlar)
  // ----------------------------------------------------------
  async getSmartAlerts(companyId: string) {
    const now   = new Date();
    const in7   = new Date(now.getTime() + 7  * 86400000);
    const in30  = new Date(now.getTime() + 30 * 86400000);
    const alerts: {
      type: string; severity: 'high' | 'medium' | 'low';
      title: string; description: string; link: string; count?: number;
    }[] = [];

    // Muddati yaqin qarzlar
    const dueSoon = await this.prisma.debtRecord.findMany({
      where: {
        contact: { companyId },
        remaining: { gt: 0 },
        dueDate: { gte: now, lte: in7 },
      },
      include: { contact: { select: { name: true } } },
    }).catch(() => [] as any[]);

    if (dueSoon.length > 0) {
      alerts.push({
        type: 'debt_due',
        severity: 'high',
        title: `${dueSoon.length} ta qarz muddati 7 kunda tugaydi`,
        description: dueSoon.slice(0, 2).map((d: any) => d.contact?.name).join(', '),
        link: '/debts',
        count: dueSoon.length,
      });
    }

    // To'lanmagan ish haqi
    const unpaidSalary = await this.prisma.salaryRecord.aggregate({
      where: { employee: { companyId }, isPaid: false },
      _count: true,
      _sum:   { totalAmount: true },
    }).catch(() => ({ _count: 0, _sum: { totalAmount: 0 } }));

    if (unpaidSalary._count > 0) {
      alerts.push({
        type: 'salary_unpaid',
        severity: 'medium',
        title: `${unpaidSalary._count} xodimga ish haqi to'lanmagan`,
        description: `Jami: ${new Intl.NumberFormat('uz-UZ').format(Number(unpaidSalary._sum.totalAmount || 0))} so'm`,
        link: '/salary',
        count: unpaidSalary._count,
      });
    }

    // Kam qoldiq mahsulotlar
    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, isService: false, minStock: { gt: 0 } },
      include: { stockItems: { select: { quantity: true } } },
    });
    const lowStock = products.filter(p => {
      const total = p.stockItems.reduce((s, i) => s + Number(i.quantity), 0);
      return total <= Number(p.minStock);
    });
    if (lowStock.length > 0) {
      alerts.push({
        type: 'low_stock',
        severity: lowStock.length >= 5 ? 'high' : 'medium',
        title: `${lowStock.length} ta mahsulot minimal qoldiqqa tushdi`,
        description: lowStock.slice(0, 3).map(p => p.name).join(', '),
        link: '/warehouse',
        count: lowStock.length,
      });
    }

    // Muddati o'tgan shartnomalar
    const expiredContracts = await this.prisma.contract.count({
      where: { companyId, status: 'ACTIVE', endDate: { lt: now } },
    }).catch(() => 0);

    if (expiredContracts > 0) {
      alerts.push({
        type: 'contract_expired',
        severity: 'medium',
        title: `${expiredContracts} ta shartnoma muddati o'tgan`,
        description: 'Aktiv shartnomalar muddatini yangilang',
        link: '/contracts',
        count: expiredContracts,
      });
    }

    return alerts.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  // ----------------------------------------------------------
  // 9. AI CONTEXT (LLM uchun strukturalangan ma'lumot)
  // ----------------------------------------------------------
  async getAIContext(companyId: string): Promise<string> {
    const [health, forecast, anomalies, alerts, depletion] = await Promise.all([
      this.getHealthScore(companyId),
      this.getSalesForecast(companyId),
      this.getAnomalies(companyId),
      this.getSmartAlerts(companyId),
      this.getStockDepletion(companyId),
    ]);

    const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

    const lines: string[] = [
      `=== BIZNES HOLATI HISOBOTI (${new Date().toLocaleDateString('uz-UZ')}) ===`,
      ``,
      `UMUMIY SKOR: ${health.total}/100 (Daraja: ${health.grade})`,
      `Xulosa: ${health.insight}`,
      ``,
      `KOMPONENTLAR:`,
      ...Object.entries(health.components).map(
        ([, v]) => `  - ${v.label}: ${v.score}/${v.max} (${v.trend})`,
      ),
      ``,
      `SAVDO BASHORATI (${forecast.month}):`,
      `  Kutilayotgan: ${fmt(forecast.predicted)} so'm`,
      `  O'sish: ${forecast.growthRate > 0 ? '+' : ''}${forecast.growthRate}%`,
      `  Ishonch: ${forecast.confidence}%`,
      ``,
    ];

    if (anomalies.length > 0) {
      lines.push(`ANOMALIYALAR (${anomalies.length} ta):`);
      anomalies.forEach(a => lines.push(`  [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`));
      lines.push('');
    }

    if (alerts.length > 0) {
      lines.push(`OGOHLANTIRISHLAR (${alerts.length} ta):`);
      alerts.forEach(a => lines.push(`  [${a.severity.toUpperCase()}] ${a.title}`));
      lines.push('');
    }

    const critDep = depletion.filter(d => d.urgency === 'critical');
    if (critDep.length > 0) {
      lines.push(`KRITIK OMBOR (${critDep.length} ta mahsulot tugatilayapti):`);
      critDep.slice(0, 5).forEach(d =>
        lines.push(`  - ${d.name}: ${d.daysUntilEmpty ?? '?'} kun qoldi`),
      );
      lines.push('');
    }

    return lines.join('\n');
  }
}

