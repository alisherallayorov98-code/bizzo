import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateCompanyDto {
  name:       string;
  legalName?: string;
  stir?:      string;
  phone?:     string;
  email?:     string;
  address?:   string;
  plan?:      'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE';
  // Admin user
  adminFirstName: string;
  adminLastName:  string;
  adminEmail:     string;
  adminPassword:  string;
}

export interface UpdateCompanyDto {
  name?:     string;
  plan?:     'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE';
  isActive?: boolean;
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PLATFORM STATISTIKASI
  // ============================================
  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      newCompaniesThisMonth,
      planBreakdown,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, role: { not: 'SUPER_ADMIN' } } }),
      this.prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.company.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
    ]);

    const plans: Record<string, number> = {
      STARTER: 0, BUSINESS: 0, PRO: 0, ENTERPRISE: 0,
    };
    planBreakdown.forEach(p => { plans[p.plan] = p._count.id; });

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalUsers,
      newCompaniesThisMonth,
      plans,
    };
  }

  // ============================================
  // KORXONALAR RO'YXATI
  // ============================================
  async getCompanies(query: {
    search?: string;
    plan?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name:      { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { stir:      { contains: query.search } },
        { email:     { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.plan)     where.plan     = query.plan;
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [total, companies] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, contacts: true, products: true },
          },
        },
      }),
    ]);

    return {
      data: companies,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================
  // BITTA KORXONA
  // ============================================
  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where:   { isActive: true, role: { not: 'SUPER_ADMIN' } },
          select:  {
            id: true, firstName: true, lastName: true,
            email: true, role: true, createdAt: true, lastLoginAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        modules: {
          select: { moduleType: true, isActive: true, expiresAt: true },
        },
        _count: {
          select: {
            contacts: true, products: true, employees: true,
            warehouses: true, debtRecords: true,
          },
        },
      },
    });

    if (!company) throw new NotFoundException('Korxona topilmadi');
    return company;
  }

  // ============================================
  // YANGI KORXONA + ADMIN YARATISH
  // ============================================
  async createCompany(dto: CreateCompanyDto) {
    // Email tekshirish
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(`${dto.adminEmail} email allaqachon mavjud`);
    }

    if (dto.stir) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { stir: dto.stir },
      });
      if (existingCompany) {
        throw new ConflictException(`${dto.stir} STIR allaqachon mavjud`);
      }
    }

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    const company = await this.prisma.company.create({
      data: {
        name:      dto.name,
        legalName: dto.legalName,
        stir:      dto.stir,
        phone:     dto.phone,
        email:     dto.email,
        address:   dto.address,
        plan:      dto.plan || 'STARTER',
        users: {
          create: {
            firstName:    dto.adminFirstName,
            lastName:     dto.adminLastName,
            email:        dto.adminEmail,
            passwordHash: hashedPassword,
            role:          'ADMIN',
            isActive:      true,
            emailVerified: true,
          },
        },
      },
      include: {
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return company;
  }

  // ============================================
  // KORXONA YANGILASH
  // ============================================
  async updateCompany(id: string, dto: UpdateCompanyDto) {
    await this.getCompany(id);
    return this.prisma.company.update({
      where: { id },
      data:  { ...dto, updatedAt: new Date() },
    });
  }

  // ============================================
  // KORXONA BLOKLASH / OCHISH
  // ============================================
  async toggleCompanyActive(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Korxona topilmadi');

    return this.prisma.company.update({
      where: { id },
      data:  { isActive: !company.isActive },
    });
  }

  // ============================================
  // PLAN O'ZGARTIRISH
  // ============================================
  async changePlan(id: string, plan: 'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE') {
    await this.getCompany(id);
    return this.prisma.company.update({
      where: { id },
      data:  { plan },
    });
  }

  // ============================================
  // BARCHA FOYDALANUVCHILAR
  // ============================================
  async getUsers(query: {
    search?: string;
    role?: string;
    companyId?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;

    const where: any = {
      role: { not: 'SUPER_ADMIN' },
    };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName:  { contains: query.search, mode: 'insensitive' } },
        { email:     { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role)      where.role      = query.role;
    if (query.companyId) where.companyId = query.companyId;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true,
          email: true, role: true, isActive: true,
          createdAt: true, lastLoginAt: true,
          company: { select: { id: true, name: true, plan: true } },
        },
      }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================
  // FOYDALANUVCHI BLOKLASH / OCHISH
  // ============================================
  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Super adminni bloklab bo\'lmaydi');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data:  { isActive: !user.isActive },
      select: { id: true, isActive: true, email: true },
    });
  }

  // ============================================
  // ADMIN PAROLINI TIKLASH
  // ============================================
  async resetUserPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Super admin parolini bu yerdan o\'zgartirish mumkin emas');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hashedPassword },
      select: { id: true, email: true },
    });
  }
}
