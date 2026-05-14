import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // YARATISH
  // ============================================
  async create(companyId: string, dto: CreateContactDto, userId: string) {
    if (dto.stir) {
      const existing = await this.prisma.contact.findFirst({
        where: { companyId, stir: dto.stir, isActive: true },
      });
      if (existing) {
        throw new ConflictException(
          `Bu STIR (${dto.stir}) allaqachon bazada mavjud: ${existing.name}`,
        );
      }
    }

    return this.prisma.contact.create({
      data: {
        ...dto,
        companyId,
        createdById: userId,
        creditLimit: dto.creditLimit ?? 0,
        paymentDays: dto.paymentDays ?? 0,
      },
    });
  }

  // ============================================
  // RO'YXAT — FILTR + QIDIRUV + SAHIFALASH
  // ============================================
  async findAll(companyId: string, query: QueryContactDto) {
    const {
      search,
      type,
      hasDebt,
      isOverdue,
      region,
      page  = 1,
      limit = 20,
      sortBy     = 'name',
      sortOrder  = 'asc',
    } = query;

    const where: Prisma.ContactWhereInput = {
      companyId,
      isActive: true,
      ...(type   && { type }),
      ...(region && { region }),
    };

    if (search) {
      where.OR = [
        { name:      { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { phone:     { contains: search } },
        { phone2:    { contains: search } },
        { email:     { contains: search, mode: 'insensitive' } },
        { stir:      { contains: search } },
      ];
    }

    if (hasDebt !== undefined || isOverdue !== undefined) {
      where.debtRecords = {
        some: {
          remaining: { gt: 0 },
          ...(isOverdue !== undefined && { isOverdue }),
        },
      };
    }

    const [total, contacts] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          debtRecords: {
            where:  { remaining: { gt: 0 } },
            select: { type: true, remaining: true, isOverdue: true },
          },
        },
      }),
    ]);

    const data = contacts.map(contact => {
      const totalReceivable = contact.debtRecords
        .filter(d => d.type === 'RECEIVABLE')
        .reduce((sum, d) => sum + Number(d.remaining), 0);

      const totalPayable = contact.debtRecords
        .filter(d => d.type === 'PAYABLE')
        .reduce((sum, d) => sum + Number(d.remaining), 0);

      const hasOverdueFlag = contact.debtRecords.some(d => d.isOverdue);

      const { debtRecords: _, ...rest } = contact;
      void _;

      return { ...rest, totalReceivable, totalPayable, hasOverdue: hasOverdueFlag };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // BITTA KONTAKT
  // ============================================
  async findOne(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where:   { id, companyId, isActive: true },
      include: {
        debtRecords: {
          where:  { remaining: { gt: 0 } },
          select: { type: true, remaining: true, isOverdue: true },
        },
      },
    });

    if (!contact) throw new NotFoundException('Kontakt topilmadi');

    const totalReceivable = contact.debtRecords
      .filter(d => d.type === 'RECEIVABLE')
      .reduce((sum, d) => sum + Number(d.remaining), 0);

    const totalPayable = contact.debtRecords
      .filter(d => d.type === 'PAYABLE')
      .reduce((sum, d) => sum + Number(d.remaining), 0);

    const hasOverdue = contact.debtRecords.some(d => d.isOverdue);

    const { debtRecords: _, ...rest } = contact;
    void _;

    return { ...rest, totalReceivable, totalPayable, hasOverdue };
  }

  // ============================================
  // YANGILASH
  // ============================================
  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateContactDto>,
  ) {
    await this.findOne(companyId, id);

    if (dto.stir) {
      const existing = await this.prisma.contact.findFirst({
        where: { companyId, stir: dto.stir, isActive: true, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `Bu STIR allaqachon mavjud: ${existing.name}`,
        );
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data:  { ...dto, updatedAt: new Date() },
    });
  }

  // ============================================
  // O'CHIRISH (SOFT DELETE)
  // ============================================
  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const hasActiveDebt = await this.prisma.debtRecord.findFirst({
      where: { contactId: id, remaining: { gt: 0 } },
    });

    if (hasActiveDebt) {
      throw new ConflictException(
        "Bu kontaktda faol qarz mavjud. Avval qarzni yoping.",
      );
    }

    return this.prisma.contact.update({
      where: { id },
      data:  { isActive: false },
    });
  }

  async bulkDelete(companyId: string, ids: string[]) {
    const result = await this.prisma.contact.updateMany({
      where: { id: { in: ids }, companyId },
      data:  { isActive: false },
    });
    return { deleted: result.count };
  }

  // ============================================
  // STATISTIKA
  // ============================================
  async getStats(companyId: string) {
    const [total, customers, suppliers, withDebt, overdue] =
      await Promise.all([
        this.prisma.contact.count({ where: { companyId, isActive: true } }),
        this.prisma.contact.count({
          where: { companyId, isActive: true, type: { in: ['CUSTOMER', 'BOTH'] } },
        }),
        this.prisma.contact.count({
          where: { companyId, isActive: true, type: { in: ['SUPPLIER', 'BOTH'] } },
        }),
        this.prisma.contact.count({
          where: {
            companyId,
            isActive: true,
            debtRecords: { some: { remaining: { gt: 0 } } },
          },
        }),
        this.prisma.contact.count({
          where: {
            companyId,
            isActive: true,
            debtRecords: { some: { remaining: { gt: 0 }, isOverdue: true } },
          },
        }),
      ]);

    const debtSums = await this.prisma.debtRecord.groupBy({
      by:    ['type'],
      where: { contact: { companyId }, remaining: { gt: 0 } },
      _sum:  { remaining: true },
    });

    const totalReceivable =
      debtSums.find(d => d.type === 'RECEIVABLE')?._sum.remaining ?? 0;
    const totalPayable =
      debtSums.find(d => d.type === 'PAYABLE')?._sum.remaining ?? 0;

    return {
      total,
      customers,
      suppliers,
      withDebt,
      overdue,
      totalReceivable: Number(totalReceivable),
      totalPayable:    Number(totalPayable),
    };
  }

  // ============================================
  // IZOH QO'SHISH
  // ============================================
  async addNote(
    companyId: string,
    contactId: string,
    note: string,
    userId: string,
  ) {
    await this.findOne(companyId, contactId);

    return this.prisma.auditLog.create({
      data: {
        companyId,
        userId,
        action:   'CONTACT_NOTE',
        entity:   'Contact',
        entityId: contactId,
        newData:  { note },
      },
    });
  }

  // ============================================
  // EKSPORT
  // ============================================
  async exportData(companyId: string, query: QueryContactDto) {
    const exportQuery = { ...query, limit: 10000, page: 1 };
    const { data } = await this.findAll(companyId, exportQuery);
    return data;
  }

  // ============================================
  // TO'LIQ KONTAKT (360°)
  // ============================================
  async getContactFull(companyId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId, isActive: true },
    });
    if (!contact) throw new NotFoundException('Kontakt topilmadi');

    const [rec, pay, overdueCount, movements, deals, recentDebts] =
      await Promise.all([
        this.prisma.debtRecord.aggregate({
          where: { contactId, companyId, type: 'RECEIVABLE', remaining: { gt: 0 } },
          _sum:   { remaining: true },
          _count: true,
        }),
        this.prisma.debtRecord.aggregate({
          where: { contactId, companyId, type: 'PAYABLE', remaining: { gt: 0 } },
          _sum:   { remaining: true },
          _count: true,
        }),
        this.prisma.debtRecord.count({
          where: { contactId, companyId, remaining: { gt: 0 }, dueDate: { lt: new Date() } },
        }),
        this.prisma.stockMovement.findMany({
          where: { contactId, warehouse: { companyId } },
          take:    30,
          orderBy: { createdAt: 'desc' },
          include: {
            product:   { select: { name: true, unit: true } },
            warehouse: { select: { name: true } },
          },
        }).catch(() => []),
        this.prisma.deal.findMany({
          where:   { contactId, companyId, isActive: true },
          take:    20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, dealNumber: true, title: true,
            stage: true, finalAmount: true, createdAt: true,
          },
        }).catch(() => []),
        this.prisma.debtRecord.findMany({
          where:   { contactId, companyId, remaining: { gt: 0 } },
          take:    15,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, type: true, amount: true, remaining: true,
            dueDate: true, isOverdue: true, createdAt: true, notes: true,
          },
        }),
      ]);

    const receivable      = Number(rec._sum.remaining ?? 0);
    const payable         = Number(pay._sum.remaining ?? 0);
    const receivableCount = rec._count;
    const payableCount    = pay._count;

    return {
      ...contact,
      debtSummary: {
        receivable,
        receivableCount,
        payable,
        payableCount,
        overdueCount,
        net: receivable - payable,
      },
      movements: movements.map(m => ({
        ...m,
        quantity:    Number(m.quantity),
        price:       Number(m.price),
        totalAmount: Number(m.totalAmount),
      })),
      deals: deals.map(d => ({ ...d, finalAmount: Number(d.finalAmount) })),
      recentDebts: recentDebts.map(d => ({
        ...d,
        amount:       Number(d.amount),
        remaining: Number(d.remaining),
      })),
      stats: {
        totalDeals: deals.length,
        wonDeals:   deals.filter((d: any) => d.stage === 'WON').length,
      },
    };
  }

  // ============================================
  // KONTAKTNING ENG KO'P ISHLATILADIGAN MAHSULOTLARI
  // (oxirgi narx, oxirgi sana, soni — auto-fill uchun)
  // ============================================
  async getFrequentProducts(
    companyId: string,
    contactId: string,
    type?: 'IN' | 'OUT',
    limit = 20,
  ) {
    const where: any = { contactId, warehouse: { companyId } };
    if (type) where.type = type;

    // Top product IDs — eng ko'p uchragan
    const grouped = await this.prisma.stockMovement.groupBy({
      by:    ['productId'],
      where,
      _count: true,
      _sum:   { quantity: true, totalAmount: true },
      orderBy: { _count: { productId: 'desc' } },
      take:    limit,
    }).catch(() => [] as any[]);

    if (grouped.length === 0) return [];

    const productIds = grouped.map(g => g.productId);
    const products   = await this.prisma.product.findMany({
      where:  { id: { in: productIds }, companyId, isActive: true },
      select: { id: true, name: true, code: true, unit: true, sellPrice: true, buyPrice: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Har bir mahsulot uchun OXIRGI tranzaksiya (sana + narx)
    const lastByProduct = await Promise.all(
      productIds.map(pid =>
        this.prisma.stockMovement.findFirst({
          where:   { contactId, productId: pid, warehouse: { companyId }, ...(type && { type }) },
          orderBy: { createdAt: 'desc' },
          select:  { createdAt: true, price: true, quantity: true, type: true },
        })
      )
    );

    return grouped.map((g, i) => {
      const product = productMap.get(g.productId);
      const last    = lastByProduct[i];
      if (!product) return null;
      return {
        productId:   product.id,
        product,
        useCount:    g._count,
        totalQty:    Number(g._sum.quantity ?? 0),
        totalAmount: Number(g._sum.totalAmount ?? 0),
        lastPrice:   last ? Number(last.price) : null,
        lastQty:     last ? Number(last.quantity) : null,
        lastDate:    last?.createdAt ?? null,
        lastType:    last?.type ?? null,
      };
    }).filter(Boolean);
  }

  // ============================================
  // KONTAKT TRANZAKSIYALARI HISOBOTI
  // (sana, mahsulot, miqdor, narx, summa)
  // ============================================
  async getContactTransactions(
    companyId: string,
    contactId: string,
    query: {
      type?:     'IN' | 'OUT'
      from?:     string
      to?:       string
      page?:     number
      limit?:    number
    },
  ) {
    const contact = await this.prisma.contact.findFirst({
      where:  { id: contactId, companyId, isActive: true },
      select: { id: true, name: true, type: true, phone: true, legalName: true },
    });
    if (!contact) throw new NotFoundException('Kontakt topilmadi');

    const page  = Math.max(1, Number(query.page  ?? 1));
    const limit = Math.min(500, Math.max(1, Number(query.limit ?? 100)));

    const where: any = { contactId, warehouse: { companyId } };
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [movements, totalCount, agg] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product:   { select: { id: true, name: true, unit: true, code: true } },
          warehouse: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.groupBy({
        by:    ['type'],
        where,
        _sum:  { quantity: true, totalAmount: true },
        _count: true,
      }).catch(() => [] as any[]),
    ]);

    const totals = {
      incoming: { count: 0, quantity: 0, amount: 0 },
      outgoing: { count: 0, quantity: 0, amount: 0 },
    };
    for (const row of agg as any[]) {
      const t = row.type === 'IN' ? totals.incoming
              : row.type === 'OUT' ? totals.outgoing
              : null;
      if (!t) continue;
      t.count    = row._count;
      t.quantity = Number(row._sum.quantity ?? 0);
      t.amount   = Number(row._sum.totalAmount ?? 0);
    }
    const netAmount = totals.incoming.amount - totals.outgoing.amount;

    return {
      contact,
      movements: movements.map(m => ({
        id:           m.id,
        date:         m.createdAt,
        type:         m.type,
        product:      m.product,
        warehouse:    m.warehouse,
        quantity:     Number(m.quantity),
        price:        Number(m.price),
        totalAmount:  Number(m.totalAmount),
        notes:        m.notes,
      })),
      totals: { ...totals, netAmount },
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}
