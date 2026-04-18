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
          remainAmount: { gt: 0 },
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
            where:  { remainAmount: { gt: 0 } },
            select: { type: true, remainAmount: true, isOverdue: true },
          },
        },
      }),
    ]);

    const data = contacts.map(contact => {
      const totalReceivable = contact.debtRecords
        .filter(d => d.type === 'RECEIVABLE')
        .reduce((sum, d) => sum + Number(d.remainAmount), 0);

      const totalPayable = contact.debtRecords
        .filter(d => d.type === 'PAYABLE')
        .reduce((sum, d) => sum + Number(d.remainAmount), 0);

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
          where:  { remainAmount: { gt: 0 } },
          select: { type: true, remainAmount: true, isOverdue: true },
        },
      },
    });

    if (!contact) throw new NotFoundException('Kontakt topilmadi');

    const totalReceivable = contact.debtRecords
      .filter(d => d.type === 'RECEIVABLE')
      .reduce((sum, d) => sum + Number(d.remainAmount), 0);

    const totalPayable = contact.debtRecords
      .filter(d => d.type === 'PAYABLE')
      .reduce((sum, d) => sum + Number(d.remainAmount), 0);

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
      where: { contactId: id, remainAmount: { gt: 0 } },
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
            debtRecords: { some: { remainAmount: { gt: 0 } } },
          },
        }),
        this.prisma.contact.count({
          where: {
            companyId,
            isActive: true,
            debtRecords: { some: { remainAmount: { gt: 0 }, isOverdue: true } },
          },
        }),
      ]);

    const debtSums = await this.prisma.debtRecord.groupBy({
      by:    ['type'],
      where: { contact: { companyId }, remainAmount: { gt: 0 } },
      _sum:  { remainAmount: true },
    });

    const totalReceivable =
      debtSums.find(d => d.type === 'RECEIVABLE')?._sum.remainAmount ?? 0;
    const totalPayable =
      debtSums.find(d => d.type === 'PAYABLE')?._sum.remainAmount ?? 0;

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
}
