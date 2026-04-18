import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService }        from '../../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'

export interface CreateFormulaDto {
  name: string
  type: string
  description?: string
  inputs: { productId: string; quantity: number; unit: string; isOptional?: boolean }[]
  outputs: {
    productId: string; quantity: number; unit: string
    isMainProduct?: boolean; isWaste?: boolean; lossPercent?: number
  }[]
}

export interface CreateBatchDto {
  formulaId: string
  inputMultiplier: number
  warehouseId?: string
  operatorId?: string
  plannedStart?: string
  plannedEnd?: string
  notes?: string
}

export interface CompleteBatchDto {
  batchId: string
  outputs: { productId: string; actualQty: number }[]
  inputs: { productId: string; actualQty: number }[]
  outputWarehouseId: string
  notes?: string
}

export interface UpdateFormulaDto {
  name?:        string
  description?: string
  inputs?: { productId: string; quantity: number; unit: string; isOptional?: boolean }[]
  outputs?: {
    productId: string; quantity: number; unit: string
    isMainProduct?: boolean; isWaste?: boolean; lossPercent?: number
  }[]
}

export interface UpdateBatchDto {
  inputMultiplier?: number
  operatorId?:      string
  warehouseId?:     string
  plannedStart?:    string
  plannedEnd?:      string
  notes?:           string
}

@Injectable()
export class ProductionService {
  constructor(
    private prisma:        PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async generateBatchNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const count = await this.prisma.productionBatch.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`) } },
    })
    return `PROD-${year}${month}-${String(count + 1).padStart(4, '0')}`
  }

  async createFormula(companyId: string, dto: CreateFormulaDto) {
    return this.prisma.productionFormula.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
        inputs: {
          create: dto.inputs.map(inp => ({
            productId: inp.productId,
            quantity: inp.quantity,
            unit: inp.unit,
            isOptional: inp.isOptional || false,
          })),
        },
        outputs: {
          create: dto.outputs.map(out => ({
            productId: out.productId,
            quantity: out.quantity,
            unit: out.unit,
            isMainProduct: out.isMainProduct || false,
            isWaste: out.isWaste || false,
            lossPercent: out.lossPercent || 0,
          })),
        },
      },
      include: {
        inputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
        outputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
      },
    })
  }

  async getFormulas(companyId: string) {
    return this.prisma.productionFormula.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        inputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
        outputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
        _count: { select: { batches: true } },
      },
    })
  }

  async createBatch(companyId: string, dto: CreateBatchDto, userId: string) {
    const formula = await this.prisma.productionFormula.findFirst({
      where: { id: dto.formulaId, companyId },
      include: { inputs: true, outputs: true },
    })
    if (!formula) throw new NotFoundException('Retsept topilmadi')

    const batchNumber = await this.generateBatchNumber(companyId)
    const multiplier = dto.inputMultiplier

    return this.prisma.productionBatch.create({
      data: {
        companyId,
        batchNumber,
        formulaId: dto.formulaId,
        inputMultiplier: multiplier,
        warehouseId: dto.warehouseId,
        operatorId: dto.operatorId,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
        status: 'PLANNED',
        notes: dto.notes,
        createdById: userId,
        inputs: {
          create: formula.inputs.map(inp => ({
            productId: inp.productId,
            plannedQty: Number(inp.quantity) * multiplier,
            actualQty: 0,
            unit: inp.unit,
          })),
        },
        outputs: {
          create: formula.outputs.map(out => ({
            productId: out.productId,
            plannedQty: Number(out.quantity) * multiplier,
            actualQty: 0,
            unit: out.unit,
            isWaste: out.isWaste,
            isMainProduct: out.isMainProduct,
          })),
        },
      },
      include: {
        formula: true,
        inputs: { include: { product: { select: { id: true, name: true } } } },
        outputs: { include: { product: { select: { id: true, name: true } } } },
      },
    })
  }

  async startBatch(companyId: string, batchId: string, _userId: string) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: batchId, companyId, status: 'PLANNED' },
      include: { inputs: { include: { product: true } } },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')
    if (!batch.warehouseId) throw new BadRequestException("Omborxona ko'rsatilmagan")

    for (const input of batch.inputs) {
      const stock = await this.prisma.stockItem.findFirst({
        where: { warehouseId: batch.warehouseId, productId: input.productId },
      })
      if (!stock || Number(stock.quantity) < Number(input.plannedQty)) {
        throw new BadRequestException(
          `${input.product.name}: yetarli miqdor yo'q. Kerak: ${input.plannedQty} ${input.unit}, Mavjud: ${stock?.quantity || 0} ${input.unit}`,
        )
      }
    }

    return this.prisma.productionBatch.update({
      where: { id: batchId },
      data: { status: 'IN_PROGRESS', actualStart: new Date() },
    })
  }

  async completeBatch(companyId: string, dto: CompleteBatchDto, userId: string) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: dto.batchId, companyId },
      include: {
        formula: true,
        inputs: { include: { product: true } },
        outputs: { include: { product: true } },
      },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')
    if (!['PLANNED', 'IN_PROGRESS'].includes(batch.status)) {
      throw new BadRequestException('Partiya allaqachon yakunlangan')
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let totalInputCost = 0

      for (const inputData of dto.inputs) {
        const batchInput = batch.inputs.find(i => i.productId === inputData.productId)
        if (!batchInput) continue

        const product = await tx.product.findUnique({
          where: { id: inputData.productId },
          select: { buyPrice: true, name: true },
        })
        const unitCost = Number(product?.buyPrice || 0)
        const cost = unitCost * inputData.actualQty
        totalInputCost += cost

        await tx.batchInput.update({
          where: { id: batchInput.id },
          data: { actualQty: inputData.actualQty, unitCost, totalCost: cost },
        })

        if (batch.warehouseId) {
          await tx.stockMovement.create({
            data: {
              warehouseId: batch.warehouseId,
              productId: inputData.productId,
              type: 'OUT',
              quantity: inputData.actualQty,
              price: unitCost,
              totalAmount: cost,
              reason: `Ishlab chiqarish: ${batch.batchNumber}`,
              referenceId: batch.id,
              referenceType: 'PRODUCTION',
              createdById: userId,
            },
          })
          await tx.stockItem.update({
            where: {
              warehouseId_productId: {
                warehouseId: batch.warehouseId,
                productId: inputData.productId,
              },
            },
            data: { quantity: { decrement: inputData.actualQty } },
          })
        }
      }

      let totalOutputQty = 0
      let totalWasteQty = 0
      let mainProductQty = 0

      for (const outputData of dto.outputs) {
        const batchOutput = batch.outputs.find(o => o.productId === outputData.productId)
        if (!batchOutput) continue

        await tx.batchOutput.update({
          where: { id: batchOutput.id },
          data: { actualQty: outputData.actualQty },
        })

        if (batchOutput.isWaste) {
          totalWasteQty += outputData.actualQty
        } else {
          totalOutputQty += outputData.actualQty
          if (batchOutput.isMainProduct) mainProductQty += outputData.actualQty
        }
      }

      const unitCost = mainProductQty > 0 ? totalInputCost / mainProductQty : 0

      for (const outputData of dto.outputs) {
        const batchOutput = batch.outputs.find(o => o.productId === outputData.productId)
        if (!batchOutput || batchOutput.isWaste || outputData.actualQty <= 0) continue

        await tx.stockMovement.create({
          data: {
            warehouseId: dto.outputWarehouseId,
            productId: outputData.productId,
            type: 'IN',
            quantity: outputData.actualQty,
            price: unitCost,
            totalAmount: unitCost * outputData.actualQty,
            reason: `Ishlab chiqarish: ${batch.batchNumber}`,
            referenceId: batch.id,
            referenceType: 'PRODUCTION',
            createdById: userId,
          },
        })

        const existingStock = await tx.stockItem.findFirst({
          where: { warehouseId: dto.outputWarehouseId, productId: outputData.productId },
        })
        if (existingStock) {
          await tx.stockItem.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: outputData.actualQty } },
          })
        } else {
          await tx.stockItem.create({
            data: {
              warehouseId: dto.outputWarehouseId,
              productId: outputData.productId,
              quantity: outputData.actualQty,
              avgPrice: unitCost,
            },
          })
        }
      }

      const totalInput = dto.inputs.reduce((s, i) => s + i.actualQty, 0)
      const totalOutput = dto.outputs.reduce((s, o) => s + o.actualQty, 0)
      const lossQty = totalInput - totalOutput
      const lossPercent = totalInput > 0 ? (lossQty / totalInput) * 100 : 0

      const mainOutputFormula = batch.formula
        ? await tx.formulaOutput.findFirst({
            where: { formulaId: batch.formulaId, isMainProduct: true, isWaste: false },
          })
        : null
      const expectedLoss = mainOutputFormula ? Number(mainOutputFormula.lossPercent) : 10
      const isAnomaly = lossPercent > expectedLoss * 1.5

      await tx.productionAnalytic.create({
        data: {
          companyId,
          batchId: batch.id,
          formulaId: batch.formulaId,
          totalInputQty: totalInput,
          totalOutputQty,
          totalWasteQty,
          wastePercent: Number(lossPercent.toFixed(2)),
          totalInputCost,
          unitCost: Number(unitCost.toFixed(2)),
          isAnomaly,
        },
      })

      const updatedBatch = await tx.productionBatch.update({
        where: { id: batch.id },
        data: { status: 'COMPLETED', actualEnd: new Date(), notes: dto.notes },
      })

      return {
        batch: updatedBatch,
        analytics: {
          totalInputCost,
          totalOutputQty,
          totalWasteQty,
          lossPercent: Number(lossPercent.toFixed(2)),
          unitCost: Number(unitCost.toFixed(2)),
          isAnomaly,
          message: isAnomaly
            ? `Yo'qotish normadan ${(lossPercent / expectedLoss).toFixed(1)}x yuqori!`
            : `Yo'qotish normal: ${lossPercent.toFixed(1)}%`,
        },
      }
    })

    // Batch yakunlanganda bildirishnoma
    const { analytics } = result
    this.notifications.create({
      companyId,
      title:    'Partiya yakunlandi',
      message:  `Tannarx: ${analytics.unitCost.toLocaleString()} so'm/dona. Yo'qotish: ${analytics.lossPercent}%${analytics.isAnomaly ? ' ⚠️' : ''}`,
      type:     analytics.isAnomaly ? 'warning' : 'success',
      category: 'system',
      link:     '/production/batches',
    }).catch(() => {})

    return result
  }

  async getBatches(companyId: string, query: { status?: string; formulaId?: string; page?: number; limit?: number }) {
    const { status, formulaId, page = 1, limit = 20 } = query
    const where: any = {
      companyId,
      ...(status && { status }),
      ...(formulaId && { formulaId }),
    }

    const [total, batches] = await Promise.all([
      this.prisma.productionBatch.count({ where }),
      this.prisma.productionBatch.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          formula: { select: { id: true, name: true, type: true } },
          inputs: { include: { product: { select: { id: true, name: true } } } },
          outputs: {
            include: { product: { select: { id: true, name: true } } },
            where: { isMainProduct: true },
          },
          _count: { select: { inputs: true, outputs: true } },
        },
      }),
    ])

    return {
      data: batches,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    }
  }

  async getStats(companyId: string) {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalBatches, activeBatches, monthlyBatches, analytics, anomalies] = await Promise.all([
      this.prisma.productionBatch.count({ where: { companyId } }),
      this.prisma.productionBatch.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.productionBatch.count({ where: { companyId, createdAt: { gte: thisMonth } } }),
      this.prisma.productionAnalytic.aggregate({
        where: { companyId, processedAt: { gte: thisMonth } },
        _avg: { wastePercent: true, unitCost: true },
        _sum: { totalInputCost: true, totalOutputQty: true },
        _count: true,
      }),
      this.prisma.productionAnalytic.count({
        where: { companyId, isAnomaly: true, processedAt: { gte: thisMonth } },
      }),
    ])

    return {
      totalBatches,
      activeBatches,
      monthlyBatches,
      monthlyOutput: Number(analytics._sum.totalOutputQty || 0),
      monthlyInputCost: Number(analytics._sum.totalInputCost || 0),
      avgWastePercent: Number(analytics._avg.wastePercent || 0).toFixed(1),
      avgUnitCost: Number(analytics._avg.unitCost || 0).toFixed(0),
      anomaliesThisMonth: anomalies,
    }
  }

  async getAnalytics(companyId: string, formulaId?: string) {
    const where: any = { companyId, ...(formulaId && { formulaId }) }
    const analytics = await this.prisma.productionAnalytic.findMany({
      where,
      orderBy: { processedAt: 'desc' },
      take: 30,
    })

    const batchIds = analytics.map(a => a.batchId)
    const batches = await this.prisma.productionBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, batchNumber: true, formula: { select: { name: true } } },
    })
    const byId = new Map(batches.map(b => [b.id, b]))

    return analytics.map(a => ({
      ...a,
      unitCost:      Number(a.unitCost),
      wastePercent:  Number(a.wastePercent),
      totalInputCost: Number(a.totalInputCost),
      totalCost:     Number((a as any).totalCost || a.totalInputCost),
      batchNumber: byId.get(a.batchId)?.batchNumber || '',
      formulaName: byId.get(a.batchId)?.formula?.name || '',
    }))
  }

  // ============================================
  // BATCH DETAIL
  // ============================================
  async getBatch(companyId: string, batchId: string) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: batchId, companyId },
      include: {
        formula: {
          include: {
            inputs:  { include: { product: { select: { id: true, name: true, unit: true, buyPrice: true } } } },
            outputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
          },
        },
        inputs:  { include: { product: { select: { id: true, name: true } } } },
        outputs: { include: { product: { select: { id: true, name: true } } } },
      },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')

    const analytic = await this.prisma.productionAnalytic.findUnique({
      where: { batchId },
    }).catch(() => null)

    // Planned cost estimate
    const plannedCost = batch.inputs.reduce((sum, inp) => {
      const price = Number((inp as any).product?.buyPrice || 0)
      return sum + Number(inp.plannedQty) * price
    }, 0)

    return {
      ...batch,
      inputMultiplier: Number(batch.inputMultiplier),
      overheadCost:    Number((batch as any).overheadCost || 0),
      inputs:  batch.inputs.map(i => ({
        ...i,
        plannedQty: Number(i.plannedQty),
        actualQty:  Number(i.actualQty),
        unitCost:   Number(i.unitCost),
        totalCost:  Number(i.totalCost),
      })),
      outputs: batch.outputs.map(o => ({
        ...o,
        plannedQty: Number(o.plannedQty),
        actualQty:  Number(o.actualQty),
      })),
      plannedCost,
      analytic: analytic ? {
        ...analytic,
        unitCost:       Number(analytic.unitCost),
        wastePercent:   Number(analytic.wastePercent),
        totalInputCost: Number(analytic.totalInputCost),
        totalCost:      Number((analytic as any).totalCost || analytic.totalInputCost),
        overheadCost:   Number((analytic as any).overheadCost || 0),
      } : null,
    }
  }

  // ============================================
  // FORMULA TAHRIRLASH
  // ============================================
  async updateFormula(companyId: string, formulaId: string, dto: UpdateFormulaDto) {
    const formula = await this.prisma.productionFormula.findFirst({
      where: { id: formulaId, companyId },
    })
    if (!formula) throw new NotFoundException('Retsept topilmadi')

    return this.prisma.$transaction(async (tx) => {
      if (dto.inputs !== undefined) {
        await tx.formulaInput.deleteMany({ where: { formulaId } })
        await tx.formulaInput.createMany({
          data: dto.inputs.map(inp => ({
            formulaId,
            productId:  inp.productId,
            quantity:   inp.quantity,
            unit:       inp.unit,
            isOptional: inp.isOptional || false,
          })),
        })
      }
      if (dto.outputs !== undefined) {
        await tx.formulaOutput.deleteMany({ where: { formulaId } })
        await tx.formulaOutput.createMany({
          data: dto.outputs.map(out => ({
            formulaId,
            productId:    out.productId,
            quantity:     out.quantity,
            unit:         out.unit,
            isMainProduct: out.isMainProduct || false,
            isWaste:       out.isWaste || false,
            lossPercent:   out.lossPercent || 0,
          })),
        })
      }
      return tx.productionFormula.update({
        where: { id: formulaId },
        data: {
          ...(dto.name        !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
        include: {
          inputs:  { include: { product: { select: { id: true, name: true, unit: true } } } },
          outputs: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      })
    })
  }

  async deleteFormula(companyId: string, formulaId: string) {
    const formula = await this.prisma.productionFormula.findFirst({
      where: { id: formulaId, companyId },
    })
    if (!formula) throw new NotFoundException('Retsept topilmadi')
    return this.prisma.productionFormula.update({
      where: { id: formulaId },
      data:  { isActive: false },
    })
  }

  // ============================================
  // TANNARX KALKULYATOR
  // ============================================
  async getCostEstimate(companyId: string, formulaId: string, multiplier: number) {
    const formula = await this.prisma.productionFormula.findFirst({
      where: { id: formulaId, companyId },
      include: {
        inputs:  { include: { product: { select: { id: true, name: true, unit: true, buyPrice: true } } } },
        outputs: {
          where: { isMainProduct: true },
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
    })
    if (!formula) throw new NotFoundException('Retsept topilmadi')

    const m = multiplier || 1
    const lines = formula.inputs.map(inp => {
      const qty       = Number(inp.quantity) * m
      const unitPrice = Number((inp as any).product?.buyPrice || 0)
      const total     = qty * unitPrice
      return {
        productId:   inp.productId,
        productName: (inp as any).product?.name || '',
        unit:        inp.unit,
        qty,
        unitPrice,
        total,
      }
    })

    const totalMaterialCost = lines.reduce((s, l) => s + l.total, 0)
    const mainOutput        = formula.outputs[0]
    const outputQty         = mainOutput ? Number(mainOutput.quantity) * m : 0
    const estimatedUnitCost = outputQty > 0 ? totalMaterialCost / outputQty : 0

    return {
      formulaId,
      formulaName:    formula.name,
      multiplier:     m,
      lines,
      totalMaterialCost,
      outputQty,
      outputUnit:        mainOutput?.unit || '',
      outputProductName: (mainOutput as any)?.product?.name || '',
      estimatedUnitCost,
    }
  }

  // ============================================
  // BATCH TAHRIRLASH
  // ============================================
  async updateBatch(companyId: string, batchId: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: batchId, companyId },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')
    if (batch.status === 'COMPLETED') {
      throw new BadRequestException("Yakunlangan partiyani o'zgartirish mumkin emas")
    }

    return this.prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        ...(dto.inputMultiplier !== undefined && { inputMultiplier: dto.inputMultiplier }),
        ...(dto.operatorId      !== undefined && { operatorId: dto.operatorId || null }),
        ...(dto.warehouseId     !== undefined && { warehouseId: dto.warehouseId || null }),
        ...(dto.plannedStart    !== undefined && {
          plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
        }),
        ...(dto.plannedEnd      !== undefined && {
          plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
        }),
        ...(dto.notes           !== undefined && { notes: dto.notes }),
      },
    })
  }

  // ============================================
  // OVERHEAD XARAJAT
  // ============================================
  async addOverhead(companyId: string, batchId: string, dto: {
    amount:      number
    description: string
  }) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: batchId, companyId },
    })
    if (!batch) throw new NotFoundException('Partiya topilmadi')
    if (batch.status === 'COMPLETED') {
      throw new BadRequestException("Yakunlangan partiyaga xarajat qo'shib bo'lmaydi")
    }

    const updated = await this.prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        overheadCost: { increment: dto.amount },
        notes: batch.notes
          ? `${batch.notes}\n[Xarajat +${dto.amount}: ${dto.description}]`
          : `[Xarajat: ${dto.amount} — ${dto.description}]`,
      },
    })

    return {
      batchId,
      newOverheadCost: Number((updated as any).overheadCost),
    }
  }
}
