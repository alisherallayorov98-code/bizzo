import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PLANS = [
  {
    name: 'FREE', displayName: 'Bepul', priceMonthly: 0, priceYearly: 0,
    maxUsers: 1, maxContacts: 100, maxProducts: 100, maxStorage: 512,
    modules: ['contacts', 'products'], features: { support: 'community' },
    isPopular: false, sortOrder: 1,
  },
  {
    name: 'STARTER', displayName: 'Boshlovchi', priceMonthly: 99000, priceYearly: 950000,
    maxUsers: 3, maxContacts: 1000, maxProducts: 1000, maxStorage: 5120,
    modules: ['contacts', 'products', 'warehouse', 'debts'], features: { support: 'email' },
    isPopular: false, sortOrder: 2,
  },
  {
    name: 'BUSINESS', displayName: 'Biznes', priceMonthly: 299000, priceYearly: 2870000,
    maxUsers: 10, maxContacts: 10000, maxProducts: 10000, maxStorage: 25600,
    modules: ['contacts', 'products', 'warehouse', 'debts', 'employees', 'reports', 'sales', 'production', 'construction', 'waste'],
    features: { support: 'priority', ai: true },
    isPopular: true, sortOrder: 3,
  },
  {
    name: 'ENTERPRISE', displayName: 'Korxona', priceMonthly: 0, priceYearly: 0,
    maxUsers: 9999, maxContacts: 9999999, maxProducts: 9999999, maxStorage: 999999,
    modules: ['*'], features: { support: 'dedicated', ai: true, sso: true, customIntegrations: true },
    isPopular: false, sortOrder: 4,
  },
]

async function main() {
  console.log('[seed-plans] Loading billing plans...')
  for (const p of PLANS) {
    await prisma.billingPlan.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    })
    console.log(` + ${p.name}`)
  }
  console.log('[seed-plans] Done')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
