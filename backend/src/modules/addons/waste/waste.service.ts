import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// ============================================
// DTOlar
// ============================================
export interface CreateBatchDto {
  sourceType:     'CITIZEN' | 'SUPPLIER';
  qualityTypeId:  string;
  inputWeight:    number;
  pricePerKg:     number;
  citizenName?:   string;
  citizenPhone?:  string;
  contactId?:     string;
  invoiceNumber?: string;
  isPaid?:        boolean;
  notes?:         string;
  receivedAt?:    string;
}

export interface CreateProcessingDto {
  batchId:          string;
  processedWeight:  number;
  outputWeight:     number;
  outputProductId?: string;
  outputNotes?:     string;
}

export interface QueryBatchDto {
  sourceType?:    string;
  qualityTypeId?: string;
  status?:        string;
  dateFrom?:      string;
  dateTo?:        string;
  contactId?:     string;
  page?:          number;
  limit?:         number;
}

@Injectable()
export class WasteService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // SIFAT TURLARI
  // ============================================
  async getQualityTypes(companyId: string) {
    const types = await this.prisma.wasteQualityType.findMany({
      where:   { companyId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { batches: true } } },
    });

    return Promise.all(
      types.map(async (type) => {
        const analytics = await this.prisma.wasteLossAnalytic.aggregate({
          where: { qualityTypeName: type.name, companyId },
          _avg:  { lossPercent: true },
          _count: true,
        });

        return {
          ...type,
          avgLossPercent: analytics._avg.lossPercent !== null
            ? Number(analytics._avg.lossPercent.toFixed(2))
            : null,
          totalProcessed: analytics._count,
        };
      }),
    );
  }

  async createQualityType(
    companyId: string,
    dto: {
      name:            string;
      expectedLossMin: number;
      expectedLossMax: number;
      buyPricePerKg:   number;
      color:           string;
    },
  ) {
    const existing = await this.prisma.wasteQualityType.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) throw new ConflictException(`"${dto.name}" turi allaqachon mavjud`);

    return this.prisma.wasteQualityType.create({
      data: { ...dto, companyId },
    });
  }

  // ============================================
  // PARTIYA RAQAMI GENERATSIYA
  // ============================================
  private async generateBatchNumber(companyId: string): Promise<string> {
    const year  = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const count = await this.prisma.wasteBatch.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt:  new Date(`${year + 1}-01-01`),
        },
      },
    });

    return `WASTE-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // ============================================
  // PARTIYA YARATISH
  // ============================================
  async createBatch(companyId: string, dto: CreateBatchDto, userId: string) {
    if (dto.sourceType === 'SUPPLIER' && !dto.contactId) {
      throw new BadRequestException('Yetkazuvchi tanlash majburiy');
    }
    if (dto.inputWeight <= 0) {
      throw new BadRequestException("Og'irlik musbat bo'lishi kerak");
    }

    const qualityType = await this.prisma.wasteQualityType.findFirst({
      where: { id: dto.qualityTypeId, companyId },
    });
    if (!qualityType) throw new NotFoundException('Sifat turi topilmadi');

    const batchNumber = await this.generateBatchNumber(companyId);
    const totalCost   = dto.inputWeight * dto.pricePerKg;

    return this.prisma.wasteBatch.create({
      data: {
        companyId,
        batchNumber,
        sourceType:    dto.sourceType,
        qualityTypeId: dto.qualityTypeId,
        inputWeight:   dto.inputWeight,
        pricePerKg:    dto.pricePerKg,
        totalCost,
        contactId:     dto.contactId,
        citizenName:   dto.citizenName,
        citizenPhone:  dto.citizenPhone,
        invoiceNumber: dto.invoiceNumber,
        isPaid:        dto.isPaid ?? false,
        notes:         dto.notes,
        receivedAt:    dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
        createdById:   userId,
        status:        'IN_STOCK',
      },
      include: { qualityType: true },
    });
  }

  // ============================================
  // PARTIYALAR RO'YXATI
  // ============================================
  async getBatches(companyId: string, query: QueryBatchDto) {
    const {
      sourceType, qualityTypeId, status,
      dateFrom, dateTo, contactId,
    } = query;
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;

    const where: any = {
      companyId,
      ...(sourceType    && { sourceType }),
      ...(qualityTypeId && { qualityTypeId }),
      ...(status        && { status }),
      ...(contactId     && { contactId }),
    };

    if (dateFrom || dateTo) {
      where.receivedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo + 'T23:59:59') }),
      };
    }

    const [total, batches] = await Promise.all([
      this.prisma.wasteBatch.count({ where }),
      this.prisma.wasteBatch.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          qualityType: { select: { name: true, color: true } },
          processingRecords: {
            select: {
              id:             true,
              outputWeight:   true,
              lossWeight:     true,
              lossPercent:    true,
              processedAt:    true,
            },
          },
          _count: { select: { processingRecords: true } },
        },
      }),
    ]);

    const batchesWithStats = batches.map(batch => {
      const processedIn = batch.processingRecords.reduce(
        (s, r) => s + r.outputWeight + r.lossWeight, 0,
      );
      const totalProcessed = batch.processingRecords.reduce(
        (s, r) => s + r.outputWeight, 0,
      );
      const totalLoss = batch.processingRecords.reduce(
        (s, r) => s + r.lossWeight, 0,
      );
      const remaining = Math.max(0, batch.inputWeight - processedIn);

      return {
        ...batch,
        totalProcessed,
        totalLoss,
        remaining,
        isFullyProcessed: remaining <= 0.001,
      };
    });

    return {
      data: batchesWithStats,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================
  // QAYTA ISHLASH — ASOSIY ALGORITM
  // ============================================
  async createProcessing(companyId: string, dto: CreateProcessingDto, userId: string) {
    const batch = await this.prisma.wasteBatch.findFirst({
      where:   { id: dto.batchId, companyId },
      include: { qualityType: true },
    });
    if (!batch) throw new NotFoundException('Partiya topilmadi');

    const alreadyProcessed = await this.prisma.wasteProcessing.aggregate({
      where: { batchId: dto.batchId },
      _sum:  { processedWeight: true },
    });

    const usedWeight = Number(alreadyProcessed._sum.processedWeight ?? 0);
    const available  = batch.inputWeight - usedWeight;

    if (dto.processedWeight > available + 0.001) {
      throw new BadRequestException(
        `Yetarli miqdor yo'q. Mavjud: ${available.toFixed(2)} kg, so'ralgan: ${dto.processedWeight} kg`,
      );
    }

    if (dto.outputWeight > dto.processedWeight) {
      throw new BadRequestException(
        "Tayyor mahsulot kiruvchi miqdordan ko'p bo'lishi mumkin emas",
      );
    }

    // ============================================
    // YO'QOTISH HISOBLASH ALGORITMI
    // FORMULA: lossPercent = (lossWeight / processedWeight) × 100
    // ============================================
    const lossWeight  = dto.processedWeight - dto.outputWeight;
    const lossPercent = (lossWeight / dto.processedWeight) * 100;

    const expectedMax  = batch.qualityType.expectedLossMax;
    const expectedMin  = batch.qualityType.expectedLossMin;
    const isAnomaly    = lossPercent > expectedMax * 1.5 || lossPercent < expectedMin * 0.5;
    const anomalyReason = isAnomaly
      ? lossPercent > expectedMax * 1.5
        ? `Kutilganidan yuqori yo'qotish: ${lossPercent.toFixed(1)}% (norma: ${expectedMin}–${expectedMax}%)`
        : `Kutilganidan past yo'qotish: ${lossPercent.toFixed(1)}% (norma: ${expectedMin}–${expectedMax}%)`
      : null;

    return this.prisma.$transaction(async (tx) => {
      // 1. Qayta ishlash yozuvi
      const processing = await tx.wasteProcessing.create({
        data: {
          companyId,
          batchId:         dto.batchId,
          processedWeight: dto.processedWeight,
          outputWeight:    dto.outputWeight,
          lossWeight,
          lossPercent,
          outputProductId: dto.outputProductId,
          outputNotes:     dto.outputNotes,
          createdById:     userId,
        },
      });

      // 2. Tahlil yozuvi
      await tx.wasteLossAnalytic.create({
        data: {
          companyId,
          processingId:    processing.id,
          qualityTypeName: batch.qualityType.name,
          sourceType:      batch.sourceType,
          contactId:       batch.contactId,
          lossPercent,
          expectedLossMin: batch.qualityType.expectedLossMin,
          expectedLossMax: batch.qualityType.expectedLossMax,
          isAnomaly,
          anomalyReason,
          processedAt:     new Date(),
        },
      });

      // 3. Ombor harakati (agar mahsulot belgilangan bo'lsa)
      if (dto.outputProductId) {
        const warehouse = await tx.warehouse.findFirst({
          where: { companyId, isDefault: true },
        });

        if (warehouse) {
          await tx.stockMovement.create({
            data: {
              warehouseId:   warehouse.id,
              productId:     dto.outputProductId,
              type:          'WASTE_OUT',
              quantity:      dto.outputWeight,
              price:         0,
              totalAmount:   0,
              reason:        `Chiqindi qayta ishlash: ${batch.batchNumber}`,
              referenceId:   processing.id,
              referenceType: 'WASTE_PROCESSING',
              createdById:   userId,
            },
          });

          await tx.stockItem.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId:   dto.outputProductId,
              },
            },
            update: { quantity: { increment: dto.outputWeight } },
            create: {
              warehouseId: warehouse.id,
              productId:   dto.outputProductId,
              quantity:    dto.outputWeight,
              avgPrice:    0,
            },
          });
        }
      }

      // 4. Partiya statusini yangilash
      const newUsed   = usedWeight + dto.processedWeight;
      const newStatus = newUsed >= batch.inputWeight * 0.99 ? 'COMPLETED' : 'PROCESSING';

      await tx.wasteBatch.update({
        where: { id: dto.batchId },
        data:  { status: newStatus },
      });

      return { processing, lossPercent, lossWeight, isAnomaly, anomalyReason };
    });
  }

  // ============================================
  // YO'QOTISH TAHLILI
  // ============================================
  async getLossAnalytics(
    companyId: string,
    filters?: { dateFrom?: string; dateTo?: string; sourceType?: string },
  ) {
    const where: any = {
      companyId,
      ...(filters?.sourceType && { sourceType: filters.sourceType }),
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.processedAt = {
        ...(filters?.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters?.dateTo   && { lte: new Date(filters.dateTo + 'T23:59:59') }),
      };
    }

    const analytics = await this.prisma.wasteLossAnalytic.findMany({
      where,
      orderBy: { processedAt: 'desc' },
    });

    // Sifat turi bo'yicha tahlil
    const byQuality: Record<string, {
      count: number; totalLoss: number; avgLoss: number;
      minLoss: number; maxLoss: number; anomalies: number;
    }> = {};

    analytics.forEach(a => {
      if (!byQuality[a.qualityTypeName]) {
        byQuality[a.qualityTypeName] = {
          count: 0, totalLoss: 0, avgLoss: 0,
          minLoss: Infinity, maxLoss: -Infinity, anomalies: 0,
        };
      }
      const q = byQuality[a.qualityTypeName];
      q.count++;
      q.totalLoss += a.lossPercent;
      q.minLoss    = Math.min(q.minLoss, a.lossPercent);
      q.maxLoss    = Math.max(q.maxLoss, a.lossPercent);
      if (a.isAnomaly) q.anomalies++;
    });

    Object.keys(byQuality).forEach(key => {
      const q    = byQuality[key];
      q.avgLoss  = Number((q.totalLoss / q.count).toFixed(2));
      q.minLoss  = q.minLoss === Infinity ? 0 : Number(q.minLoss.toFixed(2));
      q.maxLoss  = q.maxLoss === -Infinity ? 0 : Number(q.maxLoss.toFixed(2));
    });

    // Yetkazuvchi reytingi
    const bySupplier: Record<string, {
      contactId: string; count: number; totalLoss: number;
      avgLoss: number; anomalies: number; rating: number;
    }> = {};

    analytics
      .filter(a => a.sourceType === 'SUPPLIER' && a.contactId)
      .forEach(a => {
        const key = a.contactId!;
        if (!bySupplier[key]) {
          bySupplier[key] = {
            contactId: key, count: 0, totalLoss: 0,
            avgLoss: 0, anomalies: 0, rating: 0,
          };
        }
        const s = bySupplier[key];
        s.count++;
        s.totalLoss += a.lossPercent;
        if (a.isAnomaly) s.anomalies++;
      });

    const supplierRating = Object.values(bySupplier).map(s => {
      s.avgLoss = Number((s.totalLoss / s.count).toFixed(2));
      s.rating  = Math.max(1, Math.min(5, Math.round(5 - s.avgLoss / 10)));
      return s;
    }).sort((a, b) => a.avgLoss - b.avgLoss);

    // Kunlik tendentsiya
    const last30 = analytics.filter(a => {
      const days = (Date.now() - new Date(a.processedAt).getTime()) / 86400000;
      return days <= 30;
    });

    const dailyMap: Record<string, { count: number; totalLoss: number }> = {};
    last30.forEach(a => {
      const day = new Date(a.processedAt).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { count: 0, totalLoss: 0 };
      dailyMap[day].count++;
      dailyMap[day].totalLoss += a.lossPercent;
    });

    const dailyTrend = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      avgLoss: Number((d.totalLoss / d.count).toFixed(2)),
      count:   d.count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const totalCount     = analytics.length;
    const overallAvgLoss = totalCount > 0
      ? Number((analytics.reduce((s, a) => s + a.lossPercent, 0) / totalCount).toFixed(2))
      : 0;
    const anomalyCount = analytics.filter(a => a.isAnomaly).length;

    return {
      summary: {
        totalProcessed: totalCount,
        overallAvgLoss,
        anomalyCount,
        anomalyRate: totalCount > 0
          ? Number(((anomalyCount / totalCount) * 100).toFixed(1))
          : 0,
      },
      byQuality,
      supplierRating,
      dailyTrend,
      recentAnomalies: analytics
        .filter(a => a.isAnomaly)
        .slice(0, 5)
        .map(a => ({
          processedAt:   a.processedAt,
          qualityType:   a.qualityTypeName,
          lossPercent:   a.lossPercent,
          anomalyReason: a.anomalyReason,
        })),
    };
  }

  // ============================================
  // PARTIYAGA XODIM TAYINLASH
  // ============================================
  async assignWorker(
    companyId: string,
    dto: {
      batchId:      string;
      employeeId:   string;
      workDate:     string;
      hoursWorked?: number;
      notes?:       string;
    },
  ) {
    const [batch, employee] = await Promise.all([
      this.prisma.wasteBatch.findFirst({ where: { id: dto.batchId, companyId } }),
      this.prisma.employee.findFirst({ where: { id: dto.employeeId, companyId, isActive: true } }),
    ]);

    if (!batch)    throw new NotFoundException('Partiya topilmadi');
    if (!employee) throw new NotFoundException('Xodim topilmadi');

    const existing = await this.prisma.wasteBatchWorker.findUnique({
      where: {
        batchId_employeeId_workDate: {
          batchId:    dto.batchId,
          employeeId: dto.employeeId,
          workDate:   new Date(dto.workDate),
        },
      },
    });
    if (existing) throw new ConflictException('Bu xodim bu sanada allaqachon tayinlangan');

    const hoursWorked = dto.hoursWorked ?? 8;
    const dailyRate   = Number(employee.dailyRate);
    const amount      = (hoursWorked / 8) * dailyRate;

    return this.prisma.wasteBatchWorker.create({
      data: {
        batchId:    dto.batchId,
        employeeId: dto.employeeId,
        workDate:   new Date(dto.workDate),
        hoursWorked,
        dailyRate,
        amount,
        notes:      dto.notes,
      },
    });
  }

  // ============================================
  // BITTA PARTIYA DETALI
  // ============================================
  async getBatchById(companyId: string, batchId: string) {
    const batch = await this.prisma.wasteBatch.findFirst({
      where:   { id: batchId, companyId },
      include: {
        qualityType:       true,
        processingRecords: { orderBy: { processedAt: 'desc' } },
        workerAssignments: { orderBy: { workDate: 'desc' } },
      },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')

    const employeeIds = [...new Set(batch.workerAssignments.map(w => w.employeeId))]
    const employees   = await this.prisma.employee.findMany({
      where:  { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true, position: true },
    })
    const empMap = Object.fromEntries(employees.map(e => [e.id, e]))

    const totalProcessed = batch.processingRecords.reduce((s, r) => s + r.processedWeight, 0)
    const totalOutput    = batch.processingRecords.reduce((s, r) => s + r.outputWeight,    0)
    const totalLoss      = batch.processingRecords.reduce((s, r) => s + r.lossWeight,      0)

    return {
      ...batch,
      workerAssignments: batch.workerAssignments.map(w => ({
        ...w,
        employee: empMap[w.employeeId] ?? null,
      })),
      summary: {
        totalProcessed,
        totalOutput,
        totalLoss,
        remaining: batch.inputWeight - totalProcessed,
        isFullyProcessed: totalProcessed >= batch.inputWeight,
      },
    }
  }

  // ============================================
  // PARTIYANI SOTISH
  // ============================================
  async sellBatch(
    companyId: string,
    batchId:   string,
    dto: {
      buyerId:        string;
      sellPricePerKg: number;
      weight:         number;
      notes?:         string;
    },
  ) {
    const batch = await this.prisma.wasteBatch.findFirst({ where: { id: batchId, companyId } })
    if (!batch) throw new NotFoundException('Partiya topilmadi')
    if (batch.status === 'SOLD') throw new BadRequestException('Partiya allaqachon sotilgan')

    const saleAmount = dto.weight * dto.sellPricePerKg
    const dueDate    = new Date(Date.now() + 14 * 86400000)

    const [, debtRecord] = await this.prisma.$transaction([
      this.prisma.wasteBatch.update({
        where: { id: batchId },
        data:  { status: 'SOLD' },
      }),
      this.prisma.debtRecord.create({
        data: {
          companyId,
          contactId:    dto.buyerId,
          type:         'RECEIVABLE',
          amount:       saleAmount,
          remainAmount: saleAmount,
          description:  `Chiqindi partiyasi #${batch.batchNumber} (${dto.weight} kg × ${dto.sellPricePerKg} so'm)${dto.notes ? ': ' + dto.notes : ''}`,
          dueDate,
        },
      }),
    ])

    return { batch: { id: batchId, status: 'SOLD' }, debtRecord }
  }

  // ============================================
  // XODIMLAR HISOBOTI
  // ============================================
  async getWorkersReport(companyId: string, query: { dateFrom?: string; dateTo?: string }) {
    const where: any = { batch: { companyId } }
    if (query.dateFrom) where.workDate = { ...where.workDate, gte: new Date(query.dateFrom) }
    if (query.dateTo)   where.workDate = { ...where.workDate, lte: new Date(query.dateTo)   }

    const records = await this.prisma.wasteBatchWorker.findMany({
      where,
      include: { batch: { select: { batchNumber: true, qualityTypeId: true } } },
      orderBy: { workDate: 'desc' },
      take:    200,
    })

    const employeeIds = [...new Set(records.map(r => r.employeeId))]
    const employees   = await this.prisma.employee.findMany({
      where:  { id: { in: employeeIds }, companyId },
      select: { id: true, firstName: true, lastName: true, position: true, dailyRate: true },
    })
    const empMap = Object.fromEntries(employees.map(e => [e.id, e]))

    const byEmployee: Record<string, {
      employee: any; totalHours: number; totalAmount: number; unpaidAmount: number; shifts: number;
    }> = {}

    for (const r of records) {
      if (!byEmployee[r.employeeId]) {
        byEmployee[r.employeeId] = {
          employee:      empMap[r.employeeId] ?? null,
          totalHours:    0,
          totalAmount:   0,
          unpaidAmount:  0,
          shifts:        0,
        }
      }
      byEmployee[r.employeeId].totalHours   += r.hoursWorked
      byEmployee[r.employeeId].totalAmount  += r.amount
      byEmployee[r.employeeId].shifts       += 1
      if (!r.isPaid) byEmployee[r.employeeId].unpaidAmount += r.amount
    }

    return {
      summary:   Object.values(byEmployee),
      records:   records.map(r => ({ ...r, employee: empMap[r.employeeId] ?? null })),
    }
  }

  // ============================================
  // DASHBOARD STATISTIKA
  // ============================================
  async getDashboardStats(companyId: string) {
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayBatches,
      monthBatches,
      pendingBatches,
      monthProcessing,
      anomalyCount,
    ] = await Promise.all([
      this.prisma.wasteBatch.aggregate({
        where: { companyId, receivedAt: { gte: today } },
        _count: true,
        _sum:   { inputWeight: true, totalCost: true },
      }),
      this.prisma.wasteBatch.aggregate({
        where: { companyId, receivedAt: { gte: thisMonth } },
        _count: true,
        _sum:   { inputWeight: true, totalCost: true },
      }),
      this.prisma.wasteBatch.count({
        where: { companyId, status: 'IN_STOCK' },
      }),
      this.prisma.wasteProcessing.aggregate({
        where:  { companyId, processedAt: { gte: thisMonth } },
        _count: true,
        _sum:   { processedWeight: true, outputWeight: true, lossWeight: true },
        _avg:   { lossPercent: true },
      }),
      this.prisma.wasteLossAnalytic.count({
        where: { companyId, isAnomaly: true, processedAt: { gte: thisMonth } },
      }),
    ]);

    return {
      today: {
        batches:     todayBatches._count,
        totalWeight: Number(todayBatches._sum.inputWeight ?? 0),
        totalCost:   Number(todayBatches._sum.totalCost   ?? 0),
      },
      thisMonth: {
        batches:         monthBatches._count,
        totalWeight:     Number(monthBatches._sum.inputWeight  ?? 0),
        totalCost:       Number(monthBatches._sum.totalCost    ?? 0),
        processed:       monthProcessing._count,
        processedWeight: Number(monthProcessing._sum.processedWeight ?? 0),
        outputWeight:    Number(monthProcessing._sum.outputWeight    ?? 0),
        lossWeight:      Number(monthProcessing._sum.lossWeight      ?? 0),
        avgLossPercent:  Number((monthProcessing._avg.lossPercent ?? 0).toFixed(2)),
        anomalies:       anomalyCount,
      },
      pendingBatches,
    };
  }
}
