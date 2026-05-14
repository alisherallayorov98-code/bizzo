import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AutomationEngineService } from '../automation/automation-engine.service'
import { AutomationTrigger } from '../automation/dto/create-automation-rule.dto'

interface QuotationItemDto {
  productId?: string
  name:       string
  quantity:   number
  unit?:      string
  unitPrice:  number
  discount?:  number
}

interface CreateQuotationDto {
  contactId:   string
  dealId?:     string
  validUntil?: string
  notes?:      string
  discount?:   number
  taxRate?:    number
  items:       QuotationItemDto[]
}

interface QuotationFilters {
  status?:     string
  contactId?:  string
  dateFrom?:   string
  dateTo?:     string
  page?:       number
  limit?:      number
}

@Injectable()
export class QuotationsService {
  constructor(
    private prisma:  PrismaService,
    private engine:  AutomationEngineService,
  ) {}

  private async nextQuoteNumber(companyId: string): Promise<string> {
    const ym    = new Date().toISOString().slice(0, 7).replace('-', '')
    const count = await this.prisma.quotation.count({ where: { companyId } })
    return `QT-${ym}-${String(count + 1).padStart(4, '0')}`
  }

  private calcTotals(items: QuotationItemDto[], discount = 0, taxRate = 0) {
    const subtotal    = items.reduce((s, i) => {
      const lineTotal = i.quantity * i.unitPrice
      const lineDisc  = lineTotal * ((i.discount ?? 0) / 100)
      return s + lineTotal - lineDisc
    }, 0)
    const discAmount  = subtotal * (discount / 100)
    const afterDisc   = subtotal - discAmount
    const taxAmount   = afterDisc * (taxRate / 100)
    const totalAmount = afterDisc + taxAmount
    return { subtotal, totalAmount }
  }

  async create(companyId: string, userId: string, dto: CreateQuotationDto) {
    const { subtotal, totalAmount } = this.calcTotals(dto.items, dto.discount, dto.taxRate)
    const quoteNumber = await this.nextQuoteNumber(companyId)

    return this.prisma.quotation.create({
      data: {
        companyId,
        quoteNumber,
        contactId:   dto.contactId,
        dealId:      dto.dealId,
        validUntil:  dto.validUntil ? new Date(dto.validUntil) : null,
        notes:       dto.notes,
        discount:    dto.discount ?? 0,
        taxRate:     dto.taxRate  ?? 0,
        subtotal,
        totalAmount,
        createdById: userId,
        items: {
          create: dto.items.map(i => ({
            productId:  i.productId,
            name:       i.name,
            quantity:   i.quantity,
            unit:       i.unit ?? 'dona',
            unitPrice:  i.unitPrice,
            discount:   i.discount ?? 0,
            totalPrice: i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100),
          })),
        },
      },
      include: { items: { include: { product: true } }, contact: true, deal: true },
    })
  }

  async list(companyId: string, filters: QuotationFilters) {
    const page  = filters.page  || 1
    const limit = filters.limit || 20
    const where: any = { companyId }
    if (filters.status)    where.status    = filters.status
    if (filters.contactId) where.contactId = filters.contactId
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo)   where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59')
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          contact:  { select: { id: true, name: true } },
          _count:   { select: { items: true } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where:   { id, companyId },
      include: {
        items:     { include: { product: { select: { id: true, name: true, unit: true } } } },
        contact:   true,
        deal:      { select: { id: true, title: true, dealNumber: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    if (!q) throw new NotFoundException('Taklifnoma topilmadi')
    return q
  }

  async update(companyId: string, id: string, dto: Partial<CreateQuotationDto>) {
    const q = await this.prisma.quotation.findFirst({ where: { id, companyId } })
    if (!q) throw new NotFoundException()
    if (q.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT holat tahrirlanadi')

    const data: any = {}
    if (dto.contactId)          data.contactId  = dto.contactId
    if (dto.dealId !== undefined) data.dealId   = dto.dealId
    if (dto.validUntil)         data.validUntil = new Date(dto.validUntil)
    if (dto.notes !== undefined) data.notes     = dto.notes
    if (dto.discount !== undefined) data.discount = dto.discount
    if (dto.taxRate  !== undefined) data.taxRate  = dto.taxRate

    if (dto.items) {
      const { subtotal, totalAmount } = this.calcTotals(dto.items, dto.discount ?? Number(q.discount), dto.taxRate ?? Number(q.taxRate))
      data.subtotal    = subtotal
      data.totalAmount = totalAmount
      await this.prisma.quotationItem.deleteMany({ where: { quotationId: id } })
      data.items = {
        create: dto.items.map(i => ({
          productId:  i.productId,
          name:       i.name,
          quantity:   i.quantity,
          unit:       i.unit ?? 'dona',
          unitPrice:  i.unitPrice,
          discount:   i.discount ?? 0,
          totalPrice: i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100),
        })),
      }
    }

    return this.prisma.quotation.update({
      where:   { id },
      data,
      include: { items: { include: { product: true } }, contact: true },
    })
  }

  async send(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({ where: { id, companyId } })
    if (!q) throw new NotFoundException()
    if (q.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT yuboriladi')
    return this.prisma.quotation.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } })
  }

  async approve(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({ where: { id, companyId }, include: { contact: true } })
    if (!q) throw new NotFoundException()
    if (q.status !== 'SENT') throw new BadRequestException('Faqat SENT tasdiqlanadi')
    const updated = await this.prisma.quotation.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } })
    this.engine.fire({
      companyId,
      trigger:    AutomationTrigger.QUOTATION_APPROVED,
      entityId:   id,
      entityType: 'Quotation',
      data: {
        quoteNumber:  q.quoteNumber,
        totalAmount:  Number(q.totalAmount),
        contact: { name: (q as any).contact?.name, phone: (q as any).contact?.phone, email: (q as any).contact?.email },
      },
    }).catch(() => null)
    return updated
  }

  async reject(companyId: string, id: string, reason?: string) {
    const q = await this.prisma.quotation.findFirst({ where: { id, companyId }, include: { contact: true } })
    if (!q) throw new NotFoundException()
    if (!['SENT', 'APPROVED'].includes(q.status)) throw new BadRequestException('Bu holatda rad etilmaydi')
    const updated = await this.prisma.quotation.update({
      where: { id },
      data:  { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason },
    })
    this.engine.fire({
      companyId,
      trigger:    AutomationTrigger.QUOTATION_EXPIRED,
      entityId:   id,
      entityType: 'Quotation',
      data: {
        quoteNumber: q.quoteNumber,
        totalAmount: Number(q.totalAmount),
        reason:      reason ?? '',
        contact: { name: (q as any).contact?.name, phone: (q as any).contact?.phone, email: (q as any).contact?.email },
      },
    }).catch(() => null)
    return updated
  }

  async convertToInvoice(companyId: string, id: string, userId: string) {
    const q = await this.prisma.quotation.findFirst({
      where:   { id, companyId },
      include: { items: true },
    })
    if (!q) throw new NotFoundException()
    if (!['APPROVED', 'SENT'].includes(q.status)) throw new BadRequestException('Faqat APPROVED/SENT invoice ga aylantiriladi')

    const year  = new Date().getFullYear()
    const count = await this.prisma.invoice.count({ where: { companyId } })
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`

    const invoice = await this.prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber,
          contactId:   q.contactId,
          totalAmount: q.totalAmount,
          discount:    q.discount,
          taxRate:     q.taxRate,
          taxAmount:   Number(q.totalAmount) - Number(q.subtotal) * (1 - Number(q.discount) / 100),
          subtotal:    q.subtotal,
          status:      'DRAFT',
          createdById: userId,
          items: {
            create: q.items.map(i => ({
              name:       i.name,
              quantity:   i.quantity,
              unit:       i.unit,
              price:      i.unitPrice,
              discount:   i.discount,
              totalPrice: i.totalPrice,
            })),
          },
        },
      })
      await tx.quotation.update({
        where: { id },
        data:  { status: 'CONVERTED', convertedInvoiceId: inv.id },
      })
      return inv
    })

    return invoice
  }

  async remove(companyId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({ where: { id, companyId } })
    if (!q) throw new NotFoundException()
    if (q.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT o\'chiriladi')
    await this.prisma.quotation.delete({ where: { id } })
    return { ok: true }
  }

  async markExpired(companyId: string) {
    const now = new Date()
    await this.prisma.quotation.updateMany({
      where: { companyId, status: 'SENT', validUntil: { lt: now } },
      data:  { status: 'EXPIRED' },
    })
  }
}
