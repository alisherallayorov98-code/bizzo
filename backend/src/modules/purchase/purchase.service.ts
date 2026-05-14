import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AutomationEngineService } from '../automation/automation-engine.service'
import { AutomationTrigger } from '../automation/dto/create-automation-rule.dto'

interface CreatePurchaseOrderDto {
  supplierId:   string
  warehouseId:  string
  expectedDate?: string
  notes?:       string
  items: {
    productId:  string
    quantity:   number
    unitPrice:  number
  }[]
}

interface ReceiveItemDto {
  itemId:      string
  receivedQty: number
}

interface PurchaseFilters {
  status?:     string
  supplierId?: string
  dateFrom?:   string
  dateTo?:     string
  page?:       number
  limit?:      number
}

@Injectable()
export class PurchaseService {
  constructor(
    private prisma:  PrismaService,
    private engine:  AutomationEngineService,
  ) {}

  private async nextOrderNumber(companyId: string): Promise<string> {
    const ym = new Date().toISOString().slice(0, 7).replace('-', '')
    const count = await this.prisma.purchaseOrder.count({ where: { companyId } })
    return `PO-${ym}-${String(count + 1).padStart(4, '0')}`
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const totalAmount = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const orderNumber = await this.nextOrderNumber(companyId)

    return this.prisma.purchaseOrder.create({
      data: {
        companyId,
        orderNumber,
        supplierId:   dto.supplierId,
        warehouseId:  dto.warehouseId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes:        dto.notes,
        totalAmount,
        createdById:  userId,
        items: {
          create: dto.items.map(i => ({
            productId:  i.productId,
            quantity:   i.quantity,
            unitPrice:  i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
          })),
        },
      },
      include: { items: { include: { product: true } }, supplier: true, warehouse: true },
    })
  }

  async list(companyId: string, filters: PurchaseFilters) {
    const page  = filters.page  || 1
    const limit = filters.limit || 20
    const where: any = { companyId }

    if (filters.status)     where.status     = filters.status
    if (filters.supplierId) where.supplierId = filters.supplierId
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo)   where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59')
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          supplier:  { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          _count:    { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ])

    return { data, total, page, limit }
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where:   { id, companyId },
      include: {
        items:     { include: { product: { select: { id: true, name: true, unit: true, code: true } } } },
        supplier:  true,
        warehouse: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    if (!order) throw new NotFoundException('Buyurtma topilmadi')
    return order
  }

  async update(companyId: string, id: string, dto: Partial<CreatePurchaseOrderDto>) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId } })
    if (!order) throw new NotFoundException('Buyurtma topilmadi')
    if (!['DRAFT', 'SENT'].includes(order.status)) {
      throw new BadRequestException('Faqat DRAFT yoki SENT holatdagi buyurtmani tahrirlash mumkin')
    }

    const data: any = {}
    if (dto.supplierId)   data.supplierId   = dto.supplierId
    if (dto.warehouseId)  data.warehouseId  = dto.warehouseId
    if (dto.notes !== undefined) data.notes = dto.notes
    if (dto.expectedDate) data.expectedDate = new Date(dto.expectedDate)

    if (dto.items) {
      data.totalAmount = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      await this.prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } })
      data.items = {
        create: dto.items.map(i => ({
          productId:  i.productId,
          quantity:   i.quantity,
          unitPrice:  i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
        })),
      }
    }

    return this.prisma.purchaseOrder.update({
      where:   { id },
      data,
      include: { items: { include: { product: true } }, supplier: true, warehouse: true },
    })
  }

  async send(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId } })
    if (!order) throw new NotFoundException()
    if (order.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT holatdagi buyurtmani yuborish mumkin')
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'SENT' } })
  }

  async receive(companyId: string, id: string, userId: string, receiveItems: ReceiveItemDto[], createDebt = false) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where:   { id, companyId },
      include: { items: true },
    })
    if (!order) throw new NotFoundException('Buyurtma topilmadi')
    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Bu buyurtma allaqachon yopilgan')
    }

    await this.prisma.$transaction(async tx => {
      for (const ri of receiveItems) {
        const item = order.items.find(i => i.id === ri.itemId)
        if (!item) continue

        const remaining = Number(item.quantity) - Number(item.receivedQty)
        const qty = Math.min(ri.receivedQty, remaining)
        if (qty <= 0) continue

        // Update receivedQty
        await tx.purchaseOrderItem.update({
          where: { id: ri.itemId },
          data:  { receivedQty: { increment: qty } },
        })

        // StockMovement IN
        await tx.stockMovement.create({
          data: {
            warehouseId:   order.warehouseId,
            productId:     item.productId,
            contactId:     order.supplierId,
            type:          'IN',
            quantity:      qty,
            price:         item.unitPrice,
            totalAmount:   Number(item.unitPrice) * qty,
            reason:        `Xarid buyurtma #${order.orderNumber}`,
            referenceId:   order.id,
            referenceType: 'PURCHASE_ORDER',
            createdById:   userId,
          },
        })

        // Update StockItem
        const existing = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: item.productId } },
        })
        if (existing) {
          const newQty      = Number(existing.quantity) + qty
          const newAvgPrice = (Number(existing.quantity) * Number(existing.avgPrice) + qty * Number(item.unitPrice)) / newQty
          await tx.stockItem.update({
            where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: item.productId } },
            data:  { quantity: newQty, avgPrice: newAvgPrice },
          })
        } else {
          await tx.stockItem.create({
            data: { warehouseId: order.warehouseId, productId: item.productId, quantity: qty, avgPrice: item.unitPrice },
          })
        }
      }

      // Determine new status
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { orderId: id } })
      const allReceived  = updatedItems.every(i => Number(i.receivedQty) >= Number(i.quantity))
      const anyReceived  = updatedItems.some(i => Number(i.receivedQty) > 0)
      const newStatus    = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : order.status

      await tx.purchaseOrder.update({ where: { id }, data: { status: newStatus } })

      // Optional: create PAYABLE debt
      if (createDebt) {
        const receivedTotal = receiveItems.reduce((s, ri) => {
          const item = order.items.find(i => i.id === ri.itemId)
          return item ? s + ri.receivedQty * Number(item.unitPrice) : s
        }, 0)
        if (receivedTotal > 0) {
          await tx.debtRecord.create({
            data: {
              companyId,
              contactId:   order.supplierId,
              type:        'PAYABLE',
              amount:      receivedTotal,
              remaining:   receivedTotal,
              description: `Xarid #${order.orderNumber}`,
              createdById: userId,
            },
          })
        }
      }
    })

    const result = await this.findOne(companyId, id)

    if (['RECEIVED', 'PARTIAL'].includes((result as any).status)) {
      const supplier = await this.prisma.contact.findUnique({
        where:  { id: order.supplierId },
        select: { name: true, phone: true, email: true },
      }).catch(() => null)
      this.engine.fire({
        companyId,
        trigger:    AutomationTrigger.PURCHASE_RECEIVED,
        entityId:   id,
        entityType: 'PurchaseOrder',
        data: {
          orderNumber:  order.orderNumber,
          totalAmount:  Number(order.totalAmount ?? 0),
          status:       (result as any).status,
          supplier:     supplier ?? {},
        },
      }).catch(() => null)
    }

    return result
  }

  async remove(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId } })
    if (!order) throw new NotFoundException()
    if (order.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT holatdagi buyurtmani o\'chirish mumkin')
    await this.prisma.purchaseOrder.delete({ where: { id } })
    return { ok: true }
  }
}
