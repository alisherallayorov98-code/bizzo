import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

export interface UpdateCompanyDto {
  name?:      string
  legalName?: string
  stir?:      string
  address?:   string
  phone?:     string
  email?:     string
  currency?:  string
  taxRegime?: string
}

export interface CreateUserDto {
  email:     string
  password:  string
  firstName: string
  lastName:  string
  role:      string
  phone?:    string
}

const ALL_MODULES = [
  {
    type:        'WASTE_MANAGEMENT',
    name:        'Chiqindi qayta ishlash',
    description: "Partiya boshqaruvi, yo'qotish tahlili, yetkazuvchi reytingi",
    color:       '#6B7280',
    price:       299000,
  },
  {
    type:        'SALES_CRM',
    name:        'Savdo va CRM',
    description: 'Pipeline, hisob-faktura, debitor nazorati',
    color:       '#8B5CF6',
    price:       199000,
  },
  {
    type:        'CONSTRUCTION',
    name:        'Qurilish',
    description: "Obyektlar, smeta, materiallar nazorati",
    color:       '#F97316',
    price:       249000,
  },
  {
    type:        'PRODUCTION',
    name:        'Ishlab chiqarish',
    description: "Ko'payish, bo'linish, partiya boshqaruvi",
    color:       '#EC4899',
    price:       299000,
  },
  {
    type:        'SERVICE',
    name:        "Xizmat ko'rsatish",
    description: 'Murojaat tizimi, usta tayinlash, kafolat nazorati',
    color:       '#10B981',
    price:       149000,
  },
  {
    type:        'AI_ANALYTICS',
    name:        'AI Tahlil (Pro)',
    description: 'Kengaytirilgan bashorat, anomaliya, tavsiyalar',
    color:       '#3B82F6',
    price:       399000,
  },
]

const PLANS = {
  STARTER: {
    name:       'Starter',
    price:      0,
    maxUsers:   3,
    maxModules: 0,
    features:   ['Yadro funksiyalar', '3 ta foydalanuvchi', 'Asosiy hisobotlar'],
  },
  BUSINESS: {
    name:       'Business',
    price:      199000,
    maxUsers:   10,
    maxModules: 2,
    features:   ['Hammasi + 2 ta modul', '10 ta foydalanuvchi', 'Excel eksport'],
  },
  PRO: {
    name:       'Pro',
    price:      499000,
    maxUsers:   25,
    maxModules: -1,
    features:   ['Barcha modullar', '25 ta foydalanuvchi', 'PDF eksport', 'AI tahlil'],
  },
  ENTERPRISE: {
    name:       'Enterprise',
    price:      0,
    maxUsers:   -1,
    maxModules: -1,
    features:   ["Hammasi", "Cheksiz foydalanuvchilar", "Server o'rnatish", "Maxsus sozlash"],
  },
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // KOMPANIYA SOZLAMALARI
  // ============================================
  async getCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where:   { id: companyId },
      include: {
        modules: { where: { isActive: true }, orderBy: { activatedAt: 'desc' } },
        _count:  { select: { users: true } },
      },
    })
    if (!company) throw new NotFoundException('Kompaniya topilmadi')
    return company
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    if (dto.stir) {
      const existing = await this.prisma.company.findFirst({
        where: { stir: dto.stir, NOT: { id: companyId } },
      })
      if (existing) throw new ConflictException("Bu STIR allaqachon ro'yxatda")
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data:  dto,
    })
  }

  async updateLogo(companyId: string, logoUrl: string) {
    return this.prisma.company.update({
      where: { id: companyId },
      data:  { logo: logoUrl },
    })
  }

  // ============================================
  // FOYDALANUVCHILAR
  // ============================================
  async getUsers(companyId: string) {
    return this.prisma.user.findMany({
      where:   { companyId },
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }],
      select: {
        id:          true,
        email:       true,
        firstName:   true,
        lastName:    true,
        phone:       true,
        role:        true,
        isActive:    true,
        lastLoginAt: true,
        createdAt:   true,
      },
    })
  }

  async createUser(companyId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), companyId },
    })
    if (existing) throw new ConflictException("Bu email allaqachon ro'yxatda")

    const hash = await bcrypt.hash(dto.password, 12)

    return this.prisma.user.create({
      data: {
        companyId,
        email:        dto.email.toLowerCase(),
        passwordHash: hash,
        firstName:    dto.firstName,
        lastName:     dto.lastName,
        phone:        dto.phone,
        role:         dto.role as any,
      },
      select: {
        id: true, email: true,
        firstName: true, lastName: true, role: true,
      },
    })
  }

  async updateUserRole(companyId: string, userId: string, role: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    })
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi')
    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException("Super admin rolini o'zgartirish mumkin emas")
    }

    return this.prisma.user.update({
      where: { id: userId },
      data:  { role: role as any },
    })
  }

  async toggleUserActive(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    })
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi')

    return this.prisma.user.update({
      where: { id: userId },
      data:  { isActive: !user.isActive },
    })
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi')

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!isValid) throw new BadRequestException("Eski parol noto'g'ri")

    if (newPassword.length < 8) {
      throw new BadRequestException("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak")
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hash },
    })

    await this.prisma.refreshToken.deleteMany({ where: { userId } })
    return { message: "Parol muvaffaqiyatli o'zgartirildi" }
  }

  // ============================================
  // MODULLAR
  // ============================================
  async getModules(companyId: string) {
    const companyModules = await this.prisma.companyModule.findMany({
      where: { companyId },
    })

    const now = new Date()

    return ALL_MODULES.map(mod => {
      const moduleData = companyModules.find(m => m.moduleType === mod.type) || null
      const isActive   = !!(
        moduleData?.isActive &&
        (!moduleData.expiresAt || moduleData.expiresAt > now)
      )
      return { ...mod, isActive, moduleData }
    })
  }

  async activateModule(companyId: string, moduleType: string, months = 1) {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + months)

    const existing = await this.prisma.companyModule.findUnique({
      where: {
        companyId_moduleType: { companyId, moduleType: moduleType as any },
      },
    })

    if (existing) {
      return this.prisma.companyModule.update({
        where: { companyId_moduleType: { companyId, moduleType: moduleType as any } },
        data:  { isActive: true, expiresAt },
      })
    }

    return this.prisma.companyModule.create({
      data: {
        companyId,
        moduleType: moduleType as any,
        isActive:   true,
        expiresAt,
      },
    })
  }

  async deactivateModule(companyId: string, moduleType: string) {
    const existing = await this.prisma.companyModule.findUnique({
      where: { companyId_moduleType: { companyId, moduleType: moduleType as any } },
    })
    if (!existing) throw new NotFoundException('Modul topilmadi')

    return this.prisma.companyModule.update({
      where: { companyId_moduleType: { companyId, moduleType: moduleType as any } },
      data:  { isActive: false },
    })
  }

  // ============================================
  // TARIF REJASI
  // ============================================
  async getPlanInfo(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where:   { id: companyId },
      include: {
        _count: { select: { users: true, contacts: true, products: true } },
      },
    })

    const planKey   = (company?.plan || 'STARTER') as keyof typeof PLANS
    const planData  = PLANS[planKey] || PLANS.STARTER

    return {
      current: { plan: planKey, ...planData },
      usage: {
        users:    company?._count.users    || 0,
        contacts: company?._count.contacts || 0,
        products: company?._count.products || 0,
      },
      allPlans: PLANS,
    }
  }

  async updatePlan(companyId: string, plan: string) {
    return this.prisma.company.update({
      where: { id: companyId },
      data:  { plan: plan as any },
    })
  }
}
