import { Controller, Post, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private prisma: PrismaService) {}

  @Post('load-demo')
  async loadDemo(@CurrentUser() user: any) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    await this.loadSeedData(user.companyId);
    return { success: true, message: 'Demo ma\'lumotlar yuklandi' };
  }

  @Get('status')
  async getStatus(@CurrentUser() user: any) {
    const [contactsCount, productsCount, employeesCount] = await Promise.all([
      this.prisma.contact.count({ where: { companyId: user.companyId } }),
      this.prisma.product.count({ where: { companyId: user.companyId } }),
      this.prisma.employee.count({ where: { companyId: user.companyId } }),
    ]);

    const company = await this.prisma.company.findUnique({
      where:  { id: user.companyId },
      select: { name: true, stir: true },
    });

    return {
      companyConfigured: !!company?.stir,
      hasProducts:       productsCount > 0,
      hasContacts:       contactsCount > 0,
      hasEmployees:      employeesCount > 0,
      isComplete:        contactsCount > 0 && productsCount > 0,
    };
  }

  private async loadSeedData(companyId: string) {
    const demoProducts = [
      { code: 'DEMO-P01', name: 'Polipropilen qop 50kg', unit: 'dona', buyPrice: 2500, sellPrice: 3200, minStock: 500, category: 'Qoplar' },
      { code: 'DEMO-P02', name: 'Polietilen qop 25kg',   unit: 'dona', buyPrice: 1800, sellPrice: 2400, minStock: 300, category: 'Qoplar' },
      { code: 'DEMO-P03', name: 'Granula PP qayta',      unit: 'kg',   buyPrice: 4200, sellPrice: 5500, minStock: 500, category: 'Granulalar' },
    ];

    for (const p of demoProducts) {
      await this.prisma.product.create({
        data: { ...p, companyId, minPrice: Math.floor(p.sellPrice * 0.85) } as any,
      }).catch(() => {});
    }

    const demoContacts = [
      { type: 'CUSTOMER' as const, name: 'Demo Mijoz 1',      phone: '+998901000001', region: 'Toshkent'   },
      { type: 'CUSTOMER' as const, name: 'Demo Mijoz 2',      phone: '+998901000002', region: 'Samarqand'  },
      { type: 'SUPPLIER' as const, name: 'Demo Yetkazuvchi',  phone: '+998711000001', region: 'Toshkent'   },
    ];

    for (const c of demoContacts) {
      await this.prisma.contact.create({
        data: { ...c, companyId, creditLimit: 5_000_000, paymentDays: 30 } as any,
      }).catch(() => {});
    }
  }
}
