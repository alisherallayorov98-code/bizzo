import {
  Injectable, NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService }        from '../../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { AuditService }         from '../../audit/audit.service'
import { Prisma } from '@prisma/client'

export interface CreateDealDto {
  title:              string
  contactId:          string
  stage?:             string
  probability?:       number
  amount?:            number
  discount?:          number
  expectedCloseDate?: string
  assignedToId?:      string
  source?:            string
  notes?:             string
  items?: {
    productId?: string
    name:       string
    quantity:   number
    unit:       string
    price:      number
    discount?:  number
  }[]
}

export interface UpdateDealDto {
  title?:             string
  contactId?:         string
  stage?:             string
  probability?:       number
  amount?:            number
  discount?:          number
  expectedCloseDate?: string
  assignedToId?:      string
  source?:            string
  notes?:             string
  items?: {
    productId?: string
    name:       string
    quantity:   number
    unit:       string
    price:      number
    discount?:  number
  }[]
}

export interface CreateInvoiceDto {
  contactId:  string
  dealId?:    string
  taxRate?:   number
  discount?:  number
  dueDate?:   string
  notes?:     string
  items: {
    name:      string
    quantity:  number
    unit:      string
    price:     number
    discount?: number
  }[]
}

export interface QueryDealsDto {
  stage?:    string
  search?:   string
  dateFrom?: string
  dateTo?:   string
  page?:     number
  limit?:    number
}

@Injectable()
export class SalesService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
    private audit:          AuditService,
  ) {}

  // ============================================
  // RAQAM GENERATSIYA
  // ============================================
  private async generateDealNumber(companyId: string): Promise<string> {
    const year  = new Date().getFullYear()
    const count = await this.prisma.deal.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`) } },
    })
    return `DEAL-${year}-${String(count + 1).padStart(4, '0')}`
  }

  private async generateInvoiceNumber(companyId: string): Promise<string> {
    const year  = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const count = await this.prisma.invoice.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`) } },
    })
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`
  }

  // ============================================
  // DEAL YARATISH
  // ============================================
  async createDeal(companyId: string, dto: CreateDealDto, userId: string) {
    const dealNumber  = await this.generateDealNumber(companyId)
    const amount      = dto.amount   || 0
    const discount    = dto.discount || 0
    const finalAmount = amount * (1 - discount / 100)

    const stageProb: Record<string, number> = {
      LEAD: 10, QUALIFIED: 25, PROPOSAL: 50,
      NEGOTIATION: 75, WON: 100, LOST: 0,
    }
    const probability = dto.probability ?? stageProb[dto.stage || 'LEAD'] ?? 10

    const deal = await this.prisma.deal.create({
      data: {
        companyId,
        dealNumber,
        title:             dto.title,
        contactId:         dto.contactId,
        stage:             (dto.stage as any) || 'LEAD',
        probability,
        amount,
        discount,
        finalAmount,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        assignedToId:      dto.assignedToId,
        source:            dto.source,
        notes:             dto.notes,
        createdById:       userId,
        items: dto.items ? {
          create: dto.items.map(item => ({
            productId:  item.productId,
            name:       item.name,
            quantity:   item.quantity,
            unit:       item.unit,
            price:      item.price,
            discount:   item.discount || 0,
            totalPrice: item.quantity * item.price * (1 - (item.discount || 0) / 100),
          })),
        } : undefined,
        activities: {
          create: [{
            type:        'STATUS_CHANGE' as any,
            title:       `Deal yaratildi вЂ” ${dto.stage || 'LEAD'} bosqichida`,
            completedAt: new Date(),
            createdById: userId,
          }],
        },
      },
      include: {
        contact:    { select: { id: true, name: true, phone: true } },
        items:      true,
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    return deal
  }

  // ============================================
  // DEAL TAHRIRLASH
  // ============================================
  async updateDeal(companyId: string, dealId: string, dto: UpdateDealDto, userId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, companyId } })
    if (!deal) throw new NotFoundException('Deal topilmadi')

    const stageProb: Record<string, number> = {
      LEAD: 10, QUALIFIED: 25, PROPOSAL: 50,
      NEGOTIATION: 75, WON: 100, LOST: 0,
    }

    const amount      = dto.amount   ?? Number(deal.amount)
    const discount    = dto.discount ?? Number(deal.discount)
    const finalAmount = amount * (1 - discount / 100)
    const newStage    = dto.stage ?? deal.stage
    const stageChanged = dto.stage && dto.stage !== deal.stage

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.dealItem.deleteMany({ where: { dealId } })
      }

      const d = await tx.deal.update({
        where: { id: dealId },
        data: {
          ...(dto.title             !== undefined && { title: dto.title }),
          ...(dto.contactId         !== undefined && { contactId: dto.contactId }),
          ...(dto.stage             !== undefined && {
            stage:       dto.stage as any,
            probability: stageProb[dto.stage] ?? deal.probability,
            closedAt:    ['WON', 'LOST'].includes(dto.stage) ? new Date() : null,
          }),
          ...(dto.probability       !== undefined && { probability: dto.probability }),
          ...(dto.assignedToId      !== undefined && { assignedToId: dto.assignedToId }),
          ...(dto.source            !== undefined && { source: dto.source }),
          ...(dto.notes             !== undefined && { notes: dto.notes }),
          ...(dto.expectedCloseDate !== undefined && {
            expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
          }),
          amount,
          discount,
          finalAmount,
          ...(dto.items !== undefined && {
            items: {
              create: dto.items.map(item => ({
                productId:  item.productId,
                name:       item.name,
                quantity:   item.quantity,
                unit:       item.unit,
                price:      item.price,
                discount:   item.discount || 0,
                totalPrice: item.quantity * item.price * (1 - (item.discount || 0) / 100),
              })),
            },
          }),
        },
        include: {
          contact:    { select: { id: true, name: true, phone: true } },
          items:      true,
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      })

      if (stageChanged) {
        await tx.dealActivity.create({
          data: {
            dealId,
            type:        'STATUS_CHANGE' as any,
            title:       `Bosqich o'zgardi: ${this.getStageName(deal.stage)} в†’ ${this.getStageName(newStage)}`,
            completedAt: new Date(),
            createdById: userId,
          },
        })
      }

      return d
    })

    return updated
  }

  // ============================================
  // PIPELINE
  // ============================================
  async getPipeline(companyId: string, filters?: {
    assignedToId?: string
    search?:       string
  }) {
    const where: Prisma.DealWhereInput = {
      companyId,
      isActive: true,
      stage:    { notIn: ['WON', 'LOST'] },
      ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
    }

    if (filters?.search) {
      where.OR = [
        { title:   { contains: filters.search, mode: 'insensitive' } },
        { contact: { name: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    const deals = await this.prisma.deal.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        items:   { select: { totalPrice: true } },
        _count:  { select: { activities: true } },
      },
    })

    const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION']
    const pipeline = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage)
      const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.finalAmount), 0)
      return {
        stage,
        label:      this.getStageName(stage),
        color:      this.getStageColor(stage),
        deals:      stageDeals.map(d => ({
          ...d,
          amount:      Number(d.amount),
          discount:    Number(d.discount),
          finalAmount: Number(d.finalAmount),
          items: d.items.map(i => ({ ...i, totalPrice: Number(i.totalPrice) })),
        })),
        count:      stageDeals.length,
        totalValue,
      }
    })

    const pipelineValue = deals.reduce(
      (sum, d) => sum + Number(d.finalAmount) * (d.probability / 100), 0,
    )

    return { pipeline, pipelineValue }
  }

  // ============================================
  // BOSQICH O'ZGARTIRISH
  // ============================================
  async updateStage(
    companyId:   string,
    dealId:      string,
    newStage:    string,
    userId:      string,
    lostReason?: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where:   { id: dealId, companyId },
      include: { items: true },
    })
    if (!deal) throw new NotFoundException('Deal topilmadi')

    const stageProb: Record<string, number> = {
      LEAD: 10, QUALIFIED: 25, PROPOSAL: 50,
      NEGOTIATION: 75, WON: 100, LOST: 0,
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.deal.update({
        where: { id: dealId },
        data: {
          stage:       newStage as any,
          probability: stageProb[newStage] ?? deal.probability,
          closedAt:    ['WON', 'LOST'].includes(newStage) ? new Date() : null,
          lostReason:  newStage === 'LOST' ? lostReason : null,
        },
      })

      await tx.dealActivity.create({
        data: {
          dealId,
          type:       'STATUS_CHANGE' as any,
          title:      `Bosqich o'zgardi: ${this.getStageName(deal.stage)} в†’ ${this.getStageName(newStage)}`,
          description: newStage === 'LOST' && lostReason ? `Sabab: ${lostReason}` : undefined,
          completedAt: new Date(),
          createdById: userId,
        },
      })

      if (newStage === 'WON') {
        // Debt record
        await tx.debtRecord.create({
          data: {
            companyId,
            contactId:     deal.contactId,
            type:          'RECEIVABLE',
            amount:        deal.finalAmount,
            remaining:  deal.finalAmount,
            paidAmount:    0,
            referenceId:   dealId,
            referenceType: 'DEAL',
            notes:         `Deal: ${deal.dealNumber}`,
          },
        })

        // Warehouse: mahsulotli itemlar uchun stock kamaytirish
        const productItems = (deal.items as any[]).filter(i => i.productId)
        if (productItems.length > 0) {
          // Default yoki birinchi omborni topish
          const warehouse = await tx.warehouse.findFirst({
            where: { companyId, isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          })
          if (warehouse) {
            for (const item of productItems) {
              const qty = Number(item.quantity)
              if (qty <= 0) continue

              // StockItem ni yangilash
              const stockItem = await tx.stockItem.findUnique({
                where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
              })
              const current = Number(stockItem?.quantity ?? 0)
              const newQty  = Math.max(0, current - qty)

              await tx.stockItem.upsert({
                where:  { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
                update: { quantity: newQty, updatedAt: new Date() },
                create: { warehouseId: warehouse.id, productId: item.productId, quantity: 0, avgPrice: 0 },
              })

              // Harakat yozuvi
              await tx.stockMovement.create({
                data: {
                  warehouseId:   warehouse.id,
                  productId:     item.productId,
                  type:          'OUT' as any,
                  quantity:      qty,
                  price:         Number(item.price),
                  totalAmount:   Number(item.totalPrice),
                  reason:        `Savdo: ${deal.dealNumber}`,
                  referenceId:   dealId,
                  createdById:   userId,
                },
              })
            }
          }
        }
      }

      return d
    })

    this.audit.log({
      companyId, userId, action: 'DEAL_STAGE_CHANGE', entity: 'Deal', entityId: dealId,
      oldData: { stage: deal.stage }, newData: { stage: newStage },
    }).catch(() => {})

    if (newStage === 'WON') {
      this.notifications.create({
        companyId,
        title:    "Deal yutildi! рџЋ‰",
        message:  `"${updated.title}" вЂ” ${Number(updated.finalAmount).toLocaleString()} so'm`,
        type:     'success',
        category: 'system',
        link:     `/sales/deals/${dealId}`,
      }).catch(() => {})
    }

    return { ...updated, finalAmount: Number(updated.finalAmount) }
  }

  // ============================================
  // DEALLAR RO'YXATI
  // ============================================
  async getDeals(companyId: string, query: QueryDealsDto) {
    const { stage, search, dateFrom, dateTo, page = 1, limit = 20 } = query

    const where: Prisma.DealWhereInput = {
      companyId,
      isActive: true,
      ...(stage && { stage: stage as any }),
    }

    if (search) {
      where.OR = [
        { title:      { contains: search, mode: 'insensitive' } },
        { contact:    { name: { contains: search, mode: 'insensitive' } } },
        { dealNumber: { contains: search } },
      ]
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo + 'T23:59:59') }),
      }
    }

    const [total, deals] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          items:   { select: { totalPrice: true } },
          _count:  { select: { activities: true, invoices: true } },
        },
      }),
    ])

    return {
      success: true,
      data: {
        data: deals.map(d => ({
          ...d,
          amount:      Number(d.amount),
          discount:    Number(d.discount),
          finalAmount: Number(d.finalAmount),
        })),
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  // ============================================
  // INVOICE YARATISH
  // ============================================
  async createInvoice(companyId: string, dto: CreateInvoiceDto, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber(companyId)

    const subtotal = dto.items.reduce((sum, item) => {
      return sum + item.quantity * item.price * (1 - (item.discount || 0) / 100)
    }, 0)

    const taxRate     = dto.taxRate  || 0
    const discount    = dto.discount || 0
    const taxAmount   = subtotal * (taxRate / 100)
    const totalAmount = (subtotal + taxAmount) * (1 - discount / 100)

    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        dealId:     dto.dealId,
        contactId:  dto.contactId,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        totalAmount,
        dueDate:    dto.dueDate ? new Date(dto.dueDate) : null,
        notes:      dto.notes,
        createdById: userId,
        status:     'DRAFT',
        items: {
          create: dto.items.map(item => ({
            name:       item.name,
            quantity:   item.quantity,
            unit:       item.unit,
            price:      item.price,
            discount:   item.discount || 0,
            totalPrice: item.quantity * item.price * (1 - (item.discount || 0) / 100),
          })),
        },
      },
      include: {
        items:   true,
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    })

    return invoice
  }

  // ============================================
  // INVOICLAR RO'YXATI
  // ============================================
  async getInvoices(companyId: string, query: {
    status?:   string
    search?:   string
    page?:     number
    limit?:    number
  }) {
    const { status, search, page = 1, limit = 20 } = query

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      isActive: true,
      ...(status && { status: status as any }),
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { contact:       { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true } },
          items:   true,
          _count:  { select: { payments: true } },
        },
      }),
    ])

    return {
      success: true,
      data: {
        data: invoices.map(inv => ({
          ...inv,
          subtotal:     Number(inv.subtotal),
          taxAmount:    Number(inv.taxAmount),
          totalAmount:  Number(inv.totalAmount),
          paidAmount:   Number(inv.paidAmount),
        })),
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      },
    }
  }

  // ============================================
  // TO'LOV QO'SHISH
  // ============================================
  async addPayment(
    companyId: string,
    invoiceId: string,
    amount:    number,
    method:    string,
    userId:    string,
    notes?:    string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    })
    if (!invoice) throw new NotFoundException('Invoice topilmadi')

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount)
    if (amount > remaining + 0.01) {
      throw new BadRequestException(
        `To'lov miqdori oshib ketdi. Qolgan: ${remaining.toFixed(0)} so'm`,
      )
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: { invoiceId, amount, method, notes, createdById: userId },
      })

      const newPaidAmount = Number(invoice.paidAmount) + amount
      const newStatus = newPaidAmount >= Number(invoice.totalAmount) - 0.01 ? 'PAID' : 'PARTIAL'

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status:     newStatus as any,
          paidAt:     newStatus === 'PAID' ? new Date() : null,
        },
      })

      if (invoice.dealId && (newStatus === 'PAID' || newStatus === 'PARTIAL')) {
        const debt = await tx.debtRecord.findFirst({
          where: { companyId, referenceId: invoice.dealId, referenceType: 'DEAL' },
        })
        if (debt) {
          const newRemain = Math.max(0, Number(debt.remaining) - amount)
          await tx.debtRecord.update({
            where: { id: debt.id },
            data: {
              paidAmount:   Number(debt.paidAmount) + amount,
              remaining: newRemain,
            },
          })
        }
      }

      return { ...updated, totalAmount: Number(updated.totalAmount), paidAmount: Number(updated.paidAmount) }
    })
  }

  // ============================================
  // DEAL DETAIL
  // ============================================
  async getDeal(companyId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, companyId },
      include: {
        contact:    { select: { id: true, name: true, phone: true, email: true } },
        items:      true,
        activities: {
          orderBy:  { createdAt: 'desc' },
        },
        invoices: {
          where:   { isActive: true },
          orderBy: { createdAt: 'desc' },
          select:  {
            id: true, invoiceNumber: true, status: true,
            totalAmount: true, paidAmount: true, dueDate: true, createdAt: true,
          },
        },
        _count: { select: { activities: true, invoices: true } },
      },
    })
    if (!deal) throw new NotFoundException('Deal topilmadi')

    let assignedTo: { id: string; firstName: string; lastName: string; email: string } | null = null
    if (deal.assignedToId) {
      assignedTo = await this.prisma.user.findUnique({
        where:  { id: deal.assignedToId },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    }

    const d = deal as any
    return {
      ...d,
      assignedTo,
      amount:      Number(d.amount),
      discount:    Number(d.discount),
      finalAmount: Number(d.finalAmount),
      items:       (d.items  || []).map((i: any)   => ({ ...i, price: Number(i.price), totalPrice: Number(i.totalPrice) })),
      invoices:    (d.invoices || []).map((inv: any) => ({
        ...inv,
        totalAmount: Number(inv.totalAmount),
        paidAmount:  Number(inv.paidAmount),
      })),
    }
  }

  // ============================================
  // AKTIVLIKLAR
  // ============================================
  async getActivities(companyId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, companyId } })
    if (!deal) throw new NotFoundException('Deal topilmadi')

    return this.prisma.dealActivity.findMany({
      where:   { dealId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addActivity(companyId: string, dealId: string, dto: {
    type:        string
    title:       string
    description?: string
    dueDate?:    string
    completedAt?: string
  }, userId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, companyId } })
    if (!deal) throw new NotFoundException('Deal topilmadi')

    return this.prisma.dealActivity.create({
      data: {
        dealId,
        type:        dto.type as any,
        title:       dto.title,
        description: dto.description,
        scheduledAt: dto.dueDate     ? new Date(dto.dueDate)     : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        createdById: userId,
      },
    })
  }

  // ============================================
  // INVOICE STATUS YANGILASH
  // ============================================
  async updateInvoiceStatus(companyId: string, invoiceId: string, status: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, companyId } })
    if (!invoice) throw new NotFoundException('Invoice topilmadi')
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data:  { status: status as any },
    })
  }

  async getInvoice(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId, isActive: true },
      include: {
        contact:  { select: { id: true, name: true, phone: true, email: true } },
        items:    true,
        payments: { orderBy: { createdAt: 'desc' } },
        deal:     { select: { id: true, dealNumber: true, title: true } },
      },
    })
    if (!invoice) throw new NotFoundException('Invoice topilmadi')
    return {
      ...invoice,
      subtotal:    Number(invoice.subtotal),
      taxAmount:   Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount:  Number(invoice.paidAmount),
    }
  }

  // ============================================
  // BULK OPERATSIYALAR
  // ============================================
  async bulkDeleteDeals(companyId: string, ids: string[]) {
    const { count } = await this.prisma.deal.updateMany({
      where: { companyId, id: { in: ids } },
      data:  { isActive: false },
    })
    return { deleted: count }
  }

  async bulkDeleteInvoices(companyId: string, ids: string[]) {
    const { count } = await this.prisma.invoice.updateMany({
      where: { companyId, id: { in: ids } },
      data:  { isActive: false },
    })
    return { deleted: count }
  }

  // ============================================
  // STATISTIKA
  // ============================================
  async getStats(companyId: string) {
    const now          = new Date()
    const thisMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      wonThisMonth,
      wonLastMonth,
      activeDeals,
      lostThisMonth,
      overdueInvoices,
    ] = await Promise.all([
      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: thisMonth } },
        _sum:   { finalAmount: true },
        _count: true,
      }),
      this.prisma.deal.aggregate({
        where: { companyId, stage: 'WON', closedAt: { gte: lastMonth, lte: lastMonthEnd } },
        _sum:  { finalAmount: true },
        _count: true,
      }),
      this.prisma.deal.count({
        where: { companyId, isActive: true, stage: { notIn: ['WON', 'LOST'] } },
      }),
      this.prisma.deal.count({
        where: { companyId, stage: 'LOST', closedAt: { gte: thisMonth } },
      }),
      this.prisma.invoice.count({
        where: { companyId, status: { in: ['SENT', 'PARTIAL'] }, dueDate: { lt: now } },
      }),
    ])

    const pipelineDeals = await this.prisma.deal.findMany({
      where:  { companyId, isActive: true, stage: { notIn: ['WON', 'LOST'] } },
      select: { finalAmount: true, probability: true },
    })
    const pipelineValue = pipelineDeals.reduce(
      (sum, d) => sum + Number(d.finalAmount) * (d.probability / 100), 0,
    )

    const wonThisMonthAmount = Number(wonThisMonth._sum.finalAmount || 0)
    const wonLastMonthAmount = Number(wonLastMonth._sum.finalAmount || 0)
    const growthRate = wonLastMonthAmount > 0
      ? ((wonThisMonthAmount - wonLastMonthAmount) / wonLastMonthAmount) * 100
      : 0

    const totalClosed    = wonThisMonth._count + lostThisMonth
    const conversionRate = totalClosed > 0 ? (wonThisMonth._count / totalClosed) * 100 : 0

    return {
      wonThisMonth:    wonThisMonthAmount,
      wonCount:        wonThisMonth._count,
      growthRate:      Number(growthRate.toFixed(1)),
      activeDeals,
      pipelineValue,
      conversionRate:  Number(conversionRate.toFixed(1)),
      overdueInvoices,
    }
  }

  // ============================================
  // YORDAMCHI
  // ============================================
  private getStageName(stage: string): string {
    const names: Record<string, string> = {
      LEAD: 'Lead', QUALIFIED: 'Tekshirildi', PROPOSAL: 'Taklif',
      NEGOTIATION: 'Muzokara', WON: 'Yutildi', LOST: "Yo'qotildi",
    }
    return names[stage] || stage
  }

  private getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      LEAD: '#6B7280', QUALIFIED: '#3B82F6', PROPOSAL: '#8B5CF6',
      NEGOTIATION: '#F59E0B', WON: '#10B981', LOST: '#EF4444',
    }
    return colors[stage] || '#6B7280'
  }
}

