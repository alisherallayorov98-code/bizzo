import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const existing = await this.prisma.user.findFirst({
        where: { email: 'admin@demo.uz' },
      })
      if (existing) return

      this.logger.log('Seeding demo data...')

      const company = await this.prisma.company.upsert({
        where:  { id: 'demo-company-001' },
        update: {},
        create: {
          id:       'demo-company-001',
          name:     'Demo Kompaniya',
          currency: 'UZS',
          taxRegime:'GENERAL',
        },
      })

      const hash = await bcrypt.hash('Admin@123', 12)

      await this.prisma.user.upsert({
        where:  { id: 'demo-user-admin' },
        update: {},
        create: {
          id:           'demo-user-admin',
          companyId:    company.id,
          email:        'admin@demo.uz',
          passwordHash: hash,
          firstName:    'Admin',
          lastName:     'Demo',
          role:         'ADMIN',
          emailVerified: true,
        },
      })

      this.logger.log('Demo seed done — admin@demo.uz / Admin@123')
    } catch (e) {
      this.logger.error('Seed failed:', e?.message)
    }
  }
}
