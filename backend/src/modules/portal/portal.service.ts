import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'

interface PortalToken {
  companyId:  string
  contactId:  string
  email:      string
  type:       'PORTAL'
}

@Injectable()
export class PortalService {
  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
  ) {}

  // Generate magic link token (sent via email / Telegram)
  async generateMagicLink(companyId: string, contactId: string): Promise<{ token: string; url: string }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
    })
    if (!contact) throw new NotFoundException('Kontakt topilmadi')
    if (!contact.email) throw new UnauthorizedException('Kontaktda email yo\'q')

    const payload: PortalToken = {
      companyId,
      contactId: contact.id,
      email:     contact.email,
      type:      'PORTAL',
    }
    const token = this.jwt.sign(payload, { expiresIn: '7d' })
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return { token, url: `${baseUrl}/portal?token=${token}` }
  }

  async verifyToken(token: string): Promise<PortalToken> {
    try {
      const payload = this.jwt.verify<PortalToken>(token)
      if (payload.type !== 'PORTAL') throw new Error()
      return payload
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan')
    }
  }

  async getPortalData(contactId: string, companyId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
      select: {
        id: true, name: true, email: true, phone: true, type: true,
      },
    }).catch(() => null)
    if (!contact) throw new NotFoundException()

    const [debts, invoices] = await Promise.all([
      this.prisma.debtRecord.findMany({
        where:   { companyId, contactId, isPaid: false },
        orderBy: { dueDate: 'asc' },
        select: {
          id: true, amount: true, remaining: true,
          paidAmount: true, dueDate: true, description: true,
          type: true, createdAt: true,
        },
        take: 20,
      }).catch(() => []),

      this.prisma.invoice.findMany({
        where:   { companyId, contactId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, invoiceNumber: true, totalAmount: true,
          status: true, createdAt: true,
          items: {
            select: { name: true, quantity: true, price: true, totalPrice: true },
          },
        },
        take: 20,
      }).catch(() => []),
    ])

    return { contact, debts, invoices }
  }

  // ============================================================
  // SUPPLIER PORTAL
  // ============================================================

  async generateSupplierMagicLink(companyId: string, supplierId: string): Promise<{ token: string; url: string }> {
    const supplier = await this.prisma.contact.findFirst({
      where: { id: supplierId, companyId },
    })
    if (!supplier) throw new NotFoundException('Yetkazib beruvchi topilmadi')
    if (!supplier.email) throw new UnauthorizedException('Kontaktda email yo\'q')

    const payload = {
      companyId,
      contactId: supplier.id,
      email:     supplier.email,
      type:      'SUPPLIER_PORTAL' as const,
    }
    const token   = this.jwt.sign(payload, { expiresIn: '7d' })
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    return { token, url: `${baseUrl}/supplier-portal?token=${token}` }
  }

  async verifySupplierToken(token: string) {
    try {
      const payload = this.jwt.verify<any>(token)
      if (payload.type !== 'SUPPLIER_PORTAL') throw new Error()
      return payload
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan')
    }
  }

  async getSupplierPortalData(contactId: string, companyId: string) {
    const supplier = await this.prisma.contact.findFirst({
      where:  { id: contactId, companyId },
      select: { id: true, name: true, email: true, phone: true, type: true },
    })
    if (!supplier) throw new NotFoundException()

    const [purchaseOrders, payables] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where:   { companyId, supplierId: contactId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take:    20,
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
          warehouse: { select: { name: true } },
        },
      }).catch(() => []),

      this.prisma.debtRecord.findMany({
        where:   { companyId, contactId, type: 'PAYABLE', isPaid: false },
        orderBy: { dueDate: 'asc' },
        select:  { id: true, amount: true, remaining: true, dueDate: true, description: true, createdAt: true },
        take:    20,
      }).catch(() => []),
    ])

    return { supplier, purchaseOrders, payables }
  }

  async getPortalInvoice(invoiceId: string, contactId: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId, contactId },
      include: {
        items: true,
        contact: { select: { name: true, email: true, phone: true, address: true } },
      },
    })
    if (!invoice) throw new NotFoundException()
    return invoice
  }
}
