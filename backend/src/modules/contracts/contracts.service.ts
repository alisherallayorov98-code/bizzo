import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTemplateDto, UpdateTemplateDto,
  CreateContractDto, UpdateContractDto, ContractFiltersDto,
} from './dto/contract.dto';
import { Prisma, ContractStatus } from '@prisma/client';
import { renderContractHtml } from './pdf/contract-template';
import { MinioService }   from '../../common/minio/minio.service';
import { AuditService }   from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio:  MinioService,
    private readonly audit:  AuditService,
  ) {}

  // ================= TEMPLATES =================
  getTemplates(companyId: string) {
    return this.prisma.contractTemplate.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createTemplate(companyId: string, dto: CreateTemplateDto) {
    return this.prisma.contractTemplate.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        content: dto.content,
        fields: dto.fields || [],
        isDefault: dto.isDefault || false,
      },
    });
  }

  async updateTemplate(companyId: string, id: string, dto: UpdateTemplateDto) {
    const result = await this.prisma.contractTemplate.updateMany({
      where: { id, companyId },
      data: dto as any,
    });
    if (result.count === 0) throw new NotFoundException('Shablon topilmadi');
    return this.prisma.contractTemplate.findUnique({ where: { id } });
  }

  async deleteTemplate(companyId: string, id: string) {
    const result = await this.prisma.contractTemplate.updateMany({
      where: { id, companyId },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Shablon topilmadi');
    return { success: true };
  }

  // ================= CONTRACTS =================
  async getContracts(companyId: string, f: ContractFiltersDto) {
    const page = f.page || 1;
    const limit = f.limit || 20;
    const where: Prisma.ContractWhereInput = {
      companyId,
      ...(f.status && { status: f.status }),
      ...(f.type && { type: f.type }),
      ...(f.contactId && { contactId: f.contactId }),
      ...(f.from || f.to ? {
        createdAt: {
          ...(f.from && { gte: new Date(f.from) }),
          ...(f.to && { lte: new Date(f.to) }),
        },
      } : {}),
      ...(f.search && {
        OR: [
          { title: { contains: f.search, mode: 'insensitive' as const } },
          { contractNumber: { contains: f.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { contact: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getContract(companyId: string, id: string) {
    const c = await this.prisma.contract.findFirst({
      where:   { id, companyId },
      include: {
        template:  true,
        reminders: true,
        contact:   { select: { id: true, name: true, phone: true, email: true, stir: true } },
      },
    });
    if (!c) throw new NotFoundException('Shartnoma topilmadi');
    return c;
  }

  async createContract(companyId: string, dto: CreateContractDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, companyId },
    });
    if (!contact) throw new BadRequestException('Kontakt topilmadi');

    const contractNumber = await this.generateNumber(companyId);

    const contract = await this.prisma.contract.create({
      data: {
        companyId,
        templateId: dto.templateId,
        contactId: dto.contactId,
        contractNumber,
        title: dto.title,
        type: dto.type,
        data: dto.data || {},
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        totalAmount: dto.totalAmount as any,
        currency: dto.currency || 'UZS',
        notes: dto.notes,
        status: 'DRAFT',
      },
    });
    this.audit.log({ companyId, action: 'CREATE', entity: 'Contract', entityId: contract.id, newData: { contractNumber, title: dto.title } }).catch(() => {})
    return contract;
  }

  async updateContract(companyId: string, id: string, dto: UpdateContractDto) {
    const c = await this.prisma.contract.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Shartnoma topilmadi');
    if (c.status === 'COMPLETED') {
      throw new ForbiddenException('Yakunlangan shartnomani tahrirlash mumkin emas');
    }
    const result = await this.prisma.contract.updateMany({
      where: { id, companyId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalAmount: dto.totalAmount as any,
      },
    });
    if (result.count === 0) throw new NotFoundException('Shartnoma topilmadi');
    return this.prisma.contract.findUnique({ where: { id } });
  }

  async signContract(companyId: string, id: string) {
    const c = await this.prisma.contract.findFirst({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Shartnoma topilmadi');
    if (c.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT imzolanadi');

    const result = await this.prisma.contract.updateMany({
      where: { id, companyId },
      data: { status: 'ACTIVE', signedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Shartnoma topilmadi');
    const signed = await this.prisma.contract.findUnique({ where: { id } });
    this.audit.log({ companyId, action: 'UPDATE', entity: 'Contract', entityId: id, newData: { status: 'ACTIVE' } }).catch(() => {})
    return signed;
  }

  async cancelContract(companyId: string, id: string) {
    await this.getContract(companyId, id);
    const result = await this.prisma.contract.updateMany({
      where: { id, companyId },
      data: { status: 'CANCELED' },
    });
    if (result.count === 0) throw new NotFoundException('Shartnoma topilmadi');
    this.audit.log({ companyId, action: 'UPDATE', entity: 'Contract', entityId: id, newData: { status: 'CANCELED' } }).catch(() => {})
    return this.prisma.contract.findUnique({ where: { id } });
  }

  async generatePdf(companyId: string, id: string): Promise<{ url: string }> {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
      include: { template: true },
    });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');

    const contact = await this.prisma.contact.findUnique({ where: { id: contract.contactId } });
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const html = renderContractHtml({ contract, contact, company });

    const objectName = `contracts/${contract.contractNumber}.html`;
    let url: string;

    try {
      url = await this.minio.uploadString(objectName, html, 'text/html; charset=utf-8');
    } catch {
      // MinIO mavjud bo'lmasa — local fallback
      const dir = path.resolve(process.cwd(), 'uploads', 'contracts');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${contract.contractNumber}.html`), html, 'utf8');
      url = `/uploads/contracts/${contract.contractNumber}.html`;
    }

    await this.prisma.contract.update({ where: { id }, data: { pdfUrl: url } });
    return { url };
  }

  async getExpiring(companyId: string, days = 30) {
    const now = new Date();
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.contract.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        endDate: { gte: now, lte: limit },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  // ================= PRIVATE =================
  private async generateNumber(companyId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count({
      where: { companyId, contractNumber: { startsWith: `SH-${year}-` } },
    });
    return `SH-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
