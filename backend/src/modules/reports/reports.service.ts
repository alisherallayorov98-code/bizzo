import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface ReportFilters {
  dateFrom: string
  dateTo:   string
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // MOLIYAVIY HISOBOT
  // ============================================
  async getFinancialReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [salesData, debtStats, salaryExpenses, wastePurchases, monthlySales] =
      await Promise.all([
        // Sotuv (WON deallar)
        this.prisma.deal.findMany({
          where: {
            companyId,
            stage:    'WON',
            closedAt: { gte: from, lte: to },
          },
          select: {
            finalAmount: true,
            closedAt:    true,
            contact:     { select: { name: true } },
          },
          orderBy: { closedAt: 'asc' },
        }).catch(() => []),

        // Qarzlar holati
        this.prisma.debtRecord.groupBy({
          by:    ['type'],
          where: { companyId, remaining: { gt: 0 } },
          _sum:  { remaining: true },
          _count: true,
        }).catch(() => []),

        // Ish haqi xarajatlari
        this.prisma.salaryRecord.aggregate({
          where: {
            employee:  { companyId },
            createdAt: { gte: from, lte: to },
          },
          _sum: { totalAmount: true },
        }).catch(() => ({ _sum: { totalAmount: null } })),

        // Chiqindi xarid xarajatlari
        this.prisma.wasteBatch.aggregate({
          where: { companyId, receivedAt: { gte: from, lte: to } },
          _sum:  { totalCost: true },
        }).catch(() => ({ _sum: { totalCost: null } })),

        // Oylik sotuv tendentsiya
        this.prisma.$queryRaw<{ month: string; total: number; count: number }[]>`
          SELECT
            TO_CHAR("closedAt", 'YYYY-MM') AS month,
            SUM("finalAmount")::float       AS total,
            COUNT(*)::int                   AS count
          FROM "Deal"
          WHERE "companyId" = ${companyId}
            AND stage = 'WON'
            AND "closedAt" >= ${from}
            AND "closedAt" <= ${to}
          GROUP BY TO_CHAR("closedAt", 'YYYY-MM')
          ORDER BY month ASC
        `.catch(() => []),
      ])

    const totalRevenue  = salesData.map(d => Number(d.finalAmount)).reduce((s, v) => s + v, 0)
    const totalSalary   = Number(salaryExpenses._sum.totalAmount || 0)
    const totalWaste    = Number(wastePurchases._sum.totalCost   || 0)
    const totalExpenses = totalSalary + totalWaste
    const netProfit     = totalRevenue - totalExpenses

    const receivableTotal = Number(
      debtStats.find(d => d.type === 'RECEIVABLE')?._sum?.remaining || 0
    )
    const payableTotal = Number(
      debtStats.find(d => d.type === 'PAYABLE')?._sum?.remaining || 0
    )

    return {
      period:  { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0
          ? Number(((netProfit / totalRevenue) * 100).toFixed(1))
          : 0,
        receivableTotal,
        payableTotal,
        netCashFlow: receivableTotal - payableTotal,
      },
      expenses: { salary: totalSalary, waste: totalWaste },
      monthlySales,
      topSales: salesData
        .sort((a, b) => Number(b.finalAmount) - Number(a.finalAmount))
        .slice(0, 10)
        .map(d => ({
          contact:  d.contact?.name ?? 'вЂ”',
          amount:   Number(d.finalAmount),
          closedAt: d.closedAt,
        })),
    }
  }

  // ============================================
  // OMBOR HISOBOTI
  // ============================================
  async getWarehouseReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [stockItems, movements, topMovements] = await Promise.all([
      // Hozirgi qoldiq
      this.prisma.stockItem.findMany({
        where:   { warehouse: { companyId }, quantity: { gt: 0 } },
        include: {
          product:   {
            select: {
              id: true, name: true, unit: true, code: true,
              buyPrice: true, sellPrice: true, minStock: true, category: true,
            },
          },
          warehouse: { select: { name: true } },
        },
        orderBy: { quantity: 'desc' },
      }),

      // Harakat statistikasi
      this.prisma.stockMovement.groupBy({
        by:    ['type'],
        where: {
          warehouse: { companyId },
          createdAt: { gte: from, lte: to },
        },
        _sum:  { quantity: true },
        _count: true,
      }).catch(() => []),

      // Eng ko'p harakatlanganlar (OUT)
      this.prisma.stockMovement.groupBy({
        by:    ['productId'],
        where: {
          warehouse: { companyId },
          type:      'OUT',
          createdAt: { gte: from, lte: to },
        },
        _sum:   { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: 'desc' } },
        take:    10,
      }).catch(() => []),
    ])

    // Mahsulot nomlarini olish
    const productIds = topMovements.map(m => m.productId)
    const products   = productIds.length > 0
      ? await this.prisma.product.findMany({
          where:  { id: { in: productIds } },
          select: { id: true, name: true, unit: true },
        })
      : []

    const totalValue = stockItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.product.buyPrice), 0
    )

    const lowStockItems = stockItems.filter(item =>
      Number(item.product.minStock) > 0 &&
      Number(item.quantity) <= Number(item.product.minStock)
    )

    return {
      period:  { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalProducts: stockItems.length,
        totalValue,
        lowStockCount: lowStockItems.length,
        totalIn:  Number(movements.find(m => m.type === 'IN')?._sum?.quantity  || 0),
        totalOut: Number(movements.find(m => m.type === 'OUT')?._sum?.quantity || 0),
      },
      stockItems: stockItems.map(item => ({
        productId:   item.productId,
        productName: item.product.name,
        productCode: item.product.code  || '',
        category:    item.product.category || '',
        warehouse:   item.warehouse.name,
        unit:        item.product.unit,
        quantity:    Number(item.quantity),
        buyPrice:    Number(item.product.buyPrice),
        sellPrice:   Number(item.product.sellPrice),
        minStock:    Number(item.product.minStock),
        totalValue:  Number(item.quantity) * Number(item.product.buyPrice),
        isLow:       Number(item.product.minStock) > 0 &&
                     Number(item.quantity) <= Number(item.product.minStock),
      })),
      topMovements: topMovements.map(m => ({
        productId:     m.productId,
        productName:   products.find(p => p.id === m.productId)?.name || 'вЂ”',
        unit:          products.find(p => p.id === m.productId)?.unit || '',
        totalQty:      Number(m._sum.quantity || 0),
        movementCount: m._count,
      })),
      lowStockItems: lowStockItems.map(item => ({
        name:     item.product.name,
        unit:     item.product.unit,
        current:  Number(item.quantity),
        minStock: Number(item.product.minStock),
        deficit:  Number(item.product.minStock) - Number(item.quantity),
      })),
    }
  }

  // ============================================
  // SAVDO HISOBOTI
  // ============================================
  async getSalesReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const deals = await this.prisma.deal.findMany({
      where: {
        companyId,
        stage:    'WON',
        closedAt: { gte: from, lte: to },
      },
      include: {
        contact: { select: { id: true, name: true } },
        items:   { select: { name: true, quantity: true, totalPrice: true } },
      },
      orderBy: { finalAmount: 'desc' },
    }).catch(() => [])

    // Mijoz bo'yicha sotuv
    const byContact: Record<string, { name: string; total: number; count: number }> = {}
    deals.forEach(d => {
      const key = d.contactId ?? '__unknown__'
      if (!byContact[key]) {
        byContact[key] = { name: d.contact?.name ?? 'вЂ”', total: 0, count: 0 }
      }
      byContact[key].total += Number(d.finalAmount)
      byContact[key].count++
    })

    // Mahsulot bo'yicha sotuv
    const byProduct: Record<string, { name: string; total: number; qty: number }> = {}
    deals.forEach(d => {
      d.items.forEach(item => {
        if (!byProduct[item.name]) {
          byProduct[item.name] = { name: item.name, total: 0, qty: 0 }
        }
        byProduct[item.name].total += Number(item.totalPrice)
        byProduct[item.name].qty   += Number(item.quantity)
      })
    })

    const totalRevenue = deals.map(d => Number(d.finalAmount)).reduce((s, v) => s + v, 0)

    return {
      period:  { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalRevenue,
        dealsCount:  deals.length,
        avgDealSize: deals.length > 0 ? totalRevenue / deals.length : 0,
      },
      deals: deals.map(d => ({
        dealNumber: d.dealNumber,
        contact:    d.contact?.name ?? 'вЂ”',
        amount:     Number(d.finalAmount),
        closedAt:   d.closedAt,
        itemsCount: d.items.length,
      })),
      byContact: Object.values(byContact)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      byProduct: Object.values(byProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    }
  }

  // ============================================
  // XODIMLAR HISOBOTI
  // ============================================
  async getEmployeesReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const employees = await this.prisma.employee.findMany({
      where:   { companyId, isActive: true },
      include: {
        salaryRecords: {
          where: { createdAt: { gte: from, lte: to } },
        },
        dailyWorkRecords: {
          where: { workDate: { gte: from, lte: to } },
        },
      },
      orderBy: { lastName: 'asc' },
    })

    const report = employees.map(emp => {
      const salaryTotal = emp.salaryRecords.reduce(
        (s, r) => s + Number(r.totalAmount), 0
      )
      const dailyTotal = emp.dailyWorkRecords.reduce(
        (s, r) => s + Number(r.amount), 0
      )
      const workDays  = emp.dailyWorkRecords.length
      const totalDue  = salaryTotal + dailyTotal
      const totalPaid = [
        ...emp.salaryRecords.filter(r => r.isPaid).map(r => Number(r.totalAmount)),
        ...emp.dailyWorkRecords.filter(r => r.isPaid).map(r => Number(r.amount)),
      ].reduce((s, v) => s + v, 0)

      return {
        id:           emp.id,
        name:         `${emp.firstName} ${emp.lastName}`,
        position:     emp.position     || '',
        department:   emp.department   || '',
        employeeType: emp.employeeType,
        baseSalary:   Number(emp.baseSalary),
        dailyRate:    Number(emp.dailyRate),
        workDays,
        totalDue,
        totalPaid,
        unpaid: totalDue - totalPaid,
      }
    })

    const totalExpenses = report.reduce((s, e) => s + e.totalDue, 0)
    const totalPaid     = report.reduce((s, e) => s + e.totalPaid, 0)
    const totalUnpaid   = report.reduce((s, e) => s + e.unpaid, 0)

    const byDepartment: Record<string, { total: number; count: number }> = {}
    report.forEach(e => {
      const dep = e.department || 'Belgilanmagan'
      if (!byDepartment[dep]) byDepartment[dep] = { total: 0, count: 0 }
      byDepartment[dep].total += e.totalDue
      byDepartment[dep].count++
    })

    return {
      period:  { from: filters.dateFrom, to: filters.dateTo },
      summary: { totalEmployees: employees.length, totalExpenses, totalPaid, totalUnpaid },
      employees: report,
      byDepartment: Object.entries(byDepartment)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total),
    }
  }

  // ============================================
  // CHIQINDI HISOBOTI
  // ============================================
  async getWasteReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [batches, processings, analytics] = await Promise.all([
      this.prisma.wasteBatch.findMany({
        where:   { companyId, receivedAt: { gte: from, lte: to } },
        include: { qualityType: { select: { name: true, color: true } } },
        orderBy: { receivedAt: 'desc' },
      }).catch(() => []),

      this.prisma.wasteProcessing.findMany({
        where: { companyId, processedAt: { gte: from, lte: to } },
      }).catch(() => []),

      this.prisma.wasteLossAnalytic.findMany({
        where: { companyId, processedAt: { gte: from, lte: to } },
      }).catch(() => []),
    ])

    const totalInput  = batches.map(b => b.inputWeight).reduce((s, v) => s + v, 0)
    const totalCost   = batches.map(b => b.totalCost).reduce((s, v) => s + v, 0)
    const totalOutput = processings.map(p => p.outputWeight).reduce((s, v) => s + v, 0)
    const totalLoss   = processings.map(p => p.lossWeight).reduce((s, v) => s + v, 0)

    const avgLossPercent = analytics.length > 0
      ? analytics.map(a => a.lossPercent).reduce((s, v) => s + v, 0) / analytics.length
      : 0
    const anomaliesCount = analytics.filter(a => a.isAnomaly).length

    const byQuality: Record<string, {
      name: string; color: string
      count: number; totalWeight: number; totalCost: number
    }> = {}
    batches.forEach(b => {
      const key = b.qualityTypeId
      if (!byQuality[key]) {
        byQuality[key] = {
          name:        b.qualityType.name,
          color:       b.qualityType.color,
          count:       0,
          totalWeight: 0,
          totalCost:   0,
        }
      }
      byQuality[key].count++
      byQuality[key].totalWeight += b.inputWeight
      byQuality[key].totalCost   += b.totalCost
    })

    return {
      period:  { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalBatches:    batches.length,
        totalInput,
        totalOutput,
        totalLoss,
        totalCost,
        avgLossPercent:  Number(avgLossPercent.toFixed(2)),
        anomaliesCount,
        efficiency: totalInput > 0
          ? Number(((totalOutput / totalInput) * 100).toFixed(1))
          : 0,
      },
      byQuality: Object.values(byQuality),
      batches: batches.slice(0, 50).map(b => ({
        batchNumber: b.batchNumber,
        sourceType:  b.sourceType,
        qualityType: b.qualityType.name,
        inputWeight: b.inputWeight,
        totalCost:   b.totalCost,
        pricePerKg:  b.pricePerKg,
        status:      b.status,
        receivedAt:  b.receivedAt,
      })),
    }
  }

  // ============================================
  // QURILISH HISOBOTI
  // ============================================
  async getConstructionReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [projects, expenses] = await Promise.all([
      this.prisma.constructionProject.findMany({
        where: { companyId, isActive: true },
        include: {
          _count: { select: { tasks: true, workLogs: true, expenses: true } },
        },
      }).catch(() => []),
      this.prisma.projectExpense.findMany({
        where:  { project: { companyId }, expenseDate: { gte: from, lte: to } },
        select: { amount: true, category: true, isPaid: true, expenseDate: true },
      }).catch(() => []),
    ])

    const statusCounts: Record<string, number> = {}
    for (const p of projects) {
      statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
    }

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + Number(e.amount)
    }

    let totalBudget  = 0; for (const p of projects) totalBudget  += Number(p.contractAmount ?? 0)
    let totalExpense = 0; for (const e of expenses) totalExpense += Number(e.amount)
    let paidExpense  = 0; for (const e of expenses) if (e.isPaid) paidExpense += Number(e.amount)

    const overdueCount = projects.filter(p =>
      p.status === 'IN_PROGRESS' && p.endDate && p.endDate < new Date(),
    ).length

    return {
      summary: {
        totalProjects:  projects.length,
        activeProjects: (statusCounts['IN_PROGRESS'] ?? 0) + (statusCounts['PLANNING'] ?? 0),
        completedProjects: statusCounts['COMPLETED'] ?? 0,
        overdueProjects: overdueCount,
        totalBudget,
        totalExpense,
        paidExpense,
        unpaidExpense: totalExpense - paidExpense,
        profit: totalBudget - totalExpense,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      expenseByCategory:  Object.entries(expenseByCategory).map(([category, amount]) => ({ category, amount })),
      projects: projects.map(p => ({
        id:       p.id,
        name:     p.name,
        status:   p.status,
        budget:   Number(p.contractAmount ?? 0),
        tasks:    p._count.tasks,
        workLogs: p._count.workLogs,
        expenses: p._count.expenses,
        isOverdue: p.status === 'IN_PROGRESS' && !!p.endDate && p.endDate < new Date(),
        endDate:  p.endDate,
      })),
    }
  }

  // ============================================
  // ISHLAB CHIQARISH HISOBOTI
  // ============================================
  async getProductionReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [batches, outputs] = await Promise.all([
      this.prisma.productionBatch.findMany({
        where:   { companyId, createdAt: { gte: from, lte: to } },
        include: { formula: { select: { name: true } }, outputs: { include: { product: { select: { name: true, unit: true } } } } },
      }).catch(() => []),
      this.prisma.batchOutput.findMany({
        where:  { batch: { companyId, actualEnd: { gte: from, lte: to } } },
        include: { product: { select: { name: true, unit: true } } },
      }).catch(() => []),
    ])

    const statusCounts: Record<string, number> = {}
    for (const b of batches) statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1

    const outputByProduct: Record<string, { name: string; unit: string; qty: number }> = {}
    for (const o of outputs) {
      const name = (o.product as any)?.name ?? o.productId
      const unit = (o.product as any)?.unit ?? ''
      if (!outputByProduct[o.productId]) outputByProduct[o.productId] = { name, unit, qty: 0 }
      outputByProduct[o.productId].qty += Number(o.actualQty ?? o.plannedQty ?? 0)
    }

    let totalOverhead = 0; for (const b of batches) totalOverhead += Number(b.overheadCost ?? 0)

    return {
      summary: {
        totalBatches:     batches.length,
        planned:          statusCounts['PLANNED']     ?? 0,
        inProgress:       statusCounts['IN_PROGRESS'] ?? 0,
        completed:        statusCounts['COMPLETED']   ?? 0,
        cancelled:        statusCounts['CANCELLED']   ?? 0,
        totalOverhead,
        successRate: batches.length > 0
          ? Number(((statusCounts['COMPLETED'] ?? 0) / batches.length * 100).toFixed(1))
          : 0,
      },
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      outputByProduct:    Object.values(outputByProduct).sort((a, b) => b.qty - a.qty),
      batches: batches.map(b => ({
        id:         b.id,
        batchNumber: b.batchNumber,
        formula:    b.formula?.name ?? 'вЂ”',
        status:     b.status,
        overhead:   Number(b.overheadCost ?? 0),
        plannedStart: b.plannedStart,
        actualEnd:    b.actualEnd,
      })),
    }
  }

  // ============================================
  // DASHBOARD CHART MA'LUMOTLARI
  // ============================================
  async getChartsData(companyId: string) {
    const now      = new Date()
    const year     = now.getFullYear()
    const MONTHS   = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
    const currentM = now.getMonth() // 0-based

    // Build monthly buckets for the current year up to now
    const monthRange = Array.from({ length: currentM + 1 }, (_, i) => ({
      month: MONTHS[i],
      from:  new Date(year, i, 1),
      to:    new Date(year, i + 1, 0, 23, 59, 59),
    }))

    // 1. Monthly sales (WON deals)
    const salesRaw = await this.prisma.deal.findMany({
      where: {
        companyId,
        stage:    'WON',
        closedAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
      },
      select: { finalAmount: true, closedAt: true },
    }).catch(() => [])

    const salesByMonth: Record<number, number> = {}
    for (const d of salesRaw) {
      if (!d.closedAt) continue
      const m = d.closedAt.getMonth()
      salesByMonth[m] = (salesByMonth[m] ?? 0) + Number(d.finalAmount ?? 0)
    }

    // 2. Monthly stock movements (IN vs OUT)
    const movementsRaw = await this.prisma.stockMovement.findMany({
      where: {
        warehouse: { companyId },
        createdAt: { gte: new Date(year, 0, 1) },
      },
      select: { type: true, totalAmount: true, createdAt: true },
    }).catch(() => [])

    const stockIn:  Record<number, number> = {}
    const stockOut: Record<number, number> = {}
    for (const m of movementsRaw) {
      const mo = m.createdAt.getMonth()
      if (m.type === 'IN' || m.type === 'WASTE_IN') {
        stockIn[mo]  = (stockIn[mo]  ?? 0) + Number(m.totalAmount ?? 0)
      } else if (m.type === 'OUT') {
        stockOut[mo] = (stockOut[mo] ?? 0) + Number(m.totalAmount ?? 0)
      }
      // TRANSFER, ADJUSTMENT, WASTE_OUT are excluded from chart
    }

    // 3. Monthly debt balance (receivable - payable sum per month end вЂ” approximated by month of creation)
    const debtsRaw = await this.prisma.debtRecord.findMany({
      where: { companyId, createdAt: { gte: new Date(year, 0, 1) } },
      select: { type: true, amount: true, createdAt: true },
    }).catch(() => [])

    const debtReceivable: Record<number, number> = {}
    const debtPayable:    Record<number, number> = {}
    for (const d of debtsRaw) {
      const mo = d.createdAt.getMonth()
      if (d.type === 'RECEIVABLE') {
        debtReceivable[mo] = (debtReceivable[mo] ?? 0) + Number(d.amount ?? 0)
      } else {
        debtPayable[mo]    = (debtPayable[mo] ?? 0) + Number(d.amount ?? 0)
      }
    }

    // Assemble into monthly array
    const sales = monthRange.map(({ month }, i) => ({
      month,
      sotuv:  salesByMonth[i]    ?? 0,
      maqsad: 30_000_000,
    }))

    const stock = monthRange.map(({ month }, i) => ({
      month,
      kirim:  stockIn[i]  ?? 0,
      chiqim: stockOut[i] ?? 0,
    }))

    const debts = monthRange.map(({ month }, i) => ({
      month,
      debtor:   debtReceivable[i] ?? 0,
      creditor: debtPayable[i]    ?? 0,
    }))

    return { sales, stock, debts }
  }

  // ============================================
  // P&L (DAROMAD VA ZARAR)
  // ============================================
  async getPnLReport(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [invoices, salaryExpenses, cashExpenses, wasteCosts] = await Promise.all([
      (this.prisma.$queryRaw<any[]>`
        SELECT
          TO_CHAR(si."createdAt", 'YYYY-MM') AS month,
          SUM(si."totalAmount")::float        AS revenue,
          SUM(
            COALESCE((
              SELECT SUM(ii.quantity * p."buyPrice")
              FROM "invoice_items" ii
              JOIN "Product" p ON p.id = ii."productId"
              WHERE ii."invoiceId" = si.id
            ), 0)
          )::float AS cogs
        FROM "invoices" si
        WHERE si."companyId" = ${companyId}
          AND si."createdAt" >= ${from}
          AND si."createdAt" <= ${to}
          AND si.status != 'CANCELLED'
        GROUP BY TO_CHAR(si."createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `.catch(() => [])) as Promise<any[]>,

      this.prisma.salaryRecord.groupBy({
        by: ['createdAt'],
        where: { employee: { companyId }, createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true },
      }).catch(() => [] as any[]) as Promise<any[]>,

      (this.prisma.$queryRaw<any[]>`
        SELECT
          TO_CHAR("date", 'YYYY-MM') AS month,
          SUM(amount)::float          AS amount,
          category
        FROM "CashExpense"
        WHERE "companyId" = ${companyId}
          AND date >= ${from}
          AND date <= ${to}
        GROUP BY TO_CHAR("date", 'YYYY-MM'), category
        ORDER BY month ASC
      `.catch(() => [])) as Promise<any[]>,

      this.prisma.wasteBatch.groupBy({
        by: ['receivedAt'],
        where: { companyId, receivedAt: { gte: from, lte: to } },
        _sum: { totalCost: true },
      }).catch(() => [] as any[]) as Promise<any[]>,
    ])

    const totalRevenue  = invoices.reduce((s, r) => s + (r.revenue || 0), 0)
    const totalCOGS     = invoices.reduce((s, r) => s + (r.cogs || 0), 0)
    const grossProfit   = totalRevenue - totalCOGS

    const totalSalary   = salaryExpenses.reduce((s, r) => s + Number(r._sum.totalAmount || 0), 0)
    const totalWaste    = wasteCosts.reduce((s, r) => s + Number(r._sum.totalCost || 0), 0)
    const totalCashExp  = cashExpenses.reduce((s, r) => s + (r.amount || 0), 0)
    const totalOpex     = totalSalary + totalCashExp
    const ebit          = grossProfit - totalOpex
    const netProfit     = ebit - totalWaste

    const byMonth = invoices.map(r => ({
      month:       r.month,
      revenue:     r.revenue || 0,
      cogs:        r.cogs || 0,
      grossProfit: (r.revenue || 0) - (r.cogs || 0),
    }))

    const cashExpByCategory: Record<string, number> = {}
    cashExpenses.forEach(r => {
      cashExpByCategory[r.category] = (cashExpByCategory[r.category] || 0) + r.amount
    })

    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        grossMargin:  totalRevenue > 0 ? +((grossProfit / totalRevenue) * 100).toFixed(1) : 0,
        totalOpex,
        totalSalary,
        totalCashExp,
        ebit,
        totalWaste,
        netProfit,
        netMargin:    totalRevenue > 0 ? +((netProfit / totalRevenue) * 100).toFixed(1) : 0,
      },
      byMonth,
      cashExpByCategory,
    }
  }

  // ============================================
  // BALANS VARAQASI
  // ============================================
  async getBalanceSheet(companyId: string) {
    const now = new Date()

    const [stockValue, receivables, payables, cashBalance, invoicesTotal] = await Promise.all([
      // Ombordagi tovarlar (aktiv)
      this.prisma.$queryRaw<{ value: number }[]>`
        SELECT SUM(si.quantity * p."buyPrice")::float AS value
        FROM "StockItem" si
        JOIN "Product" p ON p.id = si."productId"
        JOIN "Warehouse" w ON w.id = si."warehouseId"
        WHERE w."companyId" = ${companyId}
          AND si.quantity > 0
      `.catch(() => [{ value: 0 }]),

      // Debitorlik (aktiv)
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT SUM(remaining)::float AS total
        FROM "DebtRecord"
        WHERE "companyId" = ${companyId}
          AND type = 'RECEIVABLE'
          AND "isPaid" = false
      `.catch(() => [{ total: 0 }]),

      // Kreditorlik (passiv)
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT SUM(remaining)::float AS total
        FROM "DebtRecord"
        WHERE "companyId" = ${companyId}
          AND type = 'PAYABLE'
          AND "isPaid" = false
      `.catch(() => [{ total: 0 }]),

      // Kassa qoldig'i (avanslardagi pul)
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT SUM(amount)::float AS total
        FROM "AvansRecord"
        WHERE "companyId" = ${companyId}
          AND status = 'ACTIVE'
      `.catch(() => [{ total: 0 }]),

      // Jami sotilgan (daromad)
      this.prisma.invoice.aggregate({
        where: { companyId, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }).catch(() => ({ _sum: { totalAmount: null } })),
    ])

    const assets = {
      stock:       Number(stockValue[0]?.value || 0),
      receivables: Number(receivables[0]?.total || 0),
      cash:        Number(cashBalance[0]?.total || 0),
    }
    const liabilities = {
      payables: Number(payables[0]?.total || 0),
    }
    const totalAssets      = assets.stock + assets.receivables + assets.cash
    const totalLiabilities = liabilities.payables
    const equity           = totalAssets - totalLiabilities

    return {
      asOf: now.toISOString().split('T')[0],
      assets: { ...assets, total: totalAssets },
      liabilities: { ...liabilities, total: totalLiabilities },
      equity,
      totalRevenue: Number(invoicesTotal._sum.totalAmount || 0),
    }
  }

  // ============================================
  // PULSIZ OQIM (CASH FLOW)
  // ============================================
  async getCashFlow(companyId: string, filters: ReportFilters) {
    const from = new Date(filters.dateFrom)
    const to   = new Date(filters.dateTo + 'T23:59:59')

    const [inflows, outflows, cashExpenses, salaries] = await Promise.all([
      // Kiruvchi pul: to'lovlar
      this.prisma.debtPayment.groupBy({
        by: ['createdAt'],
        where: {
          debt: { companyId, type: 'RECEIVABLE' },
          createdAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }).catch(() => [] as any[]) as Promise<any[]>,

      // Chiquvchi pul: payable to'lovlar
      this.prisma.debtPayment.groupBy({
        by: ['createdAt'],
        where: {
          debt: { companyId, type: 'PAYABLE' },
          createdAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }).catch(() => [] as any[]) as Promise<any[]>,

      // Naqd xarajatlar
      (this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount)::float AS amount
        FROM "CashExpense"
        WHERE "companyId" = ${companyId}
          AND date >= ${from}
          AND date <= ${to}
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month ASC
      `.catch(() => [])) as Promise<any[]>,

      // Ish haqi
      (this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR(sr."createdAt", 'YYYY-MM') AS month, SUM(sr."totalAmount")::float AS amount
        FROM "SalaryRecord" sr
        JOIN "Employee" e ON e.id = sr."employeeId"
        WHERE e."companyId" = ${companyId}
          AND sr."createdAt" >= ${from}
          AND sr."createdAt" <= ${to}
        GROUP BY TO_CHAR(sr."createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `.catch(() => [])) as Promise<any[]>,
    ])

    const totalInflow  = inflows.reduce((s, r) => s + Number(r._sum.amount || 0), 0)
    const totalOutflow = outflows.reduce((s, r) => s + Number(r._sum.amount || 0), 0)
    const totalCashExp = cashExpenses.reduce((s, r) => s + (r.amount || 0), 0)
    const totalSalary  = salaries.reduce((s, r) => s + (r.amount || 0), 0)
    const totalExpenses = totalOutflow + totalCashExp + totalSalary
    const netCashFlow   = totalInflow - totalExpenses

    // Oylik breakdown
    const months: Record<string, { inflow: number; outflow: number }> = {}
    inflows.forEach(r => {
      const m = new Date(r.createdAt).toISOString().slice(0, 7)
      months[m] = months[m] || { inflow: 0, outflow: 0 }
      months[m].inflow += Number(r._sum.amount || 0)
    })
    outflows.forEach(r => {
      const m = new Date(r.createdAt).toISOString().slice(0, 7)
      months[m] = months[m] || { inflow: 0, outflow: 0 }
      months[m].outflow += Number(r._sum.amount || 0)
    })
    cashExpenses.forEach(r => {
      months[r.month] = months[r.month] || { inflow: 0, outflow: 0 }
      months[r.month].outflow += r.amount
    })
    salaries.forEach(r => {
      months[r.month] = months[r.month] || { inflow: 0, outflow: 0 }
      months[r.month].outflow += r.amount
    })

    const byMonth = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        inflow:   v.inflow,
        outflow:  v.outflow,
        net:      v.inflow - v.outflow,
      }))

    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      summary: {
        totalInflow,
        totalOutflow,
        totalCashExp,
        totalSalary,
        totalExpenses,
        netCashFlow,
      },
      byMonth,
    }
  }
}

