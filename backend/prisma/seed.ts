import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] BIZZO demo data loading...')

  const company = await prisma.company.upsert({
    where:  { id: 'demo-company-001' },
    update: {},
    create: {
      id:        'demo-company-001',
      name:      'Toshmatov Savdo MChJ',
      legalName: 'Toshmatov va Sheriklar MChJ',
      stir:      '123456789',
      address:   "Toshkent sh., Yunusobod t., Amir Temur ko'chasi, 108",
      phone:     '+998712345678',
      email:     'info@toshmatov.uz',
      currency:  'UZS',
      taxRegime: 'GENERAL',
      plan:      'PRO',
    },
  })

  const adminHash   = await bcrypt.hash('Admin@123', 12)
  const managerHash = await bcrypt.hash('Manager@123', 12)

  const adminUser = await prisma.user.upsert({
    where:  { id: 'demo-user-admin' },
    update: {},
    create: {
      id:           'demo-user-admin',
      companyId:    company.id,
      email:        'admin@demo.uz',
      passwordHash: adminHash,
      firstName:    'Alisher',
      lastName:     'Toshmatov',
      phone:        '+998901234567',
      role:         'ADMIN',
    },
  })

  await prisma.user.upsert({
    where:  { id: 'demo-user-manager' },
    update: {},
    create: {
      id:           'demo-user-manager',
      companyId:    company.id,
      email:        'manager@demo.uz',
      passwordHash: managerHash,
      firstName:    'Sardor',
      lastName:     'Rahimov',
      role:         'MANAGER',
    },
  })

  const modules = ['WASTE_MANAGEMENT', 'SALES_CRM', 'AI_ANALYTICS']
  for (const mod of modules) {
    await prisma.companyModule.upsert({
      where:  { companyId_moduleType: { companyId: company.id, moduleType: mod as any } },
      update: {},
      create: {
        companyId:  company.id,
        moduleType: mod as any,
        isActive:   true,
        expiresAt:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })
  }

  const contacts = [
    { id: 'demo-contact-001', type: 'CUSTOMER' as const, name: 'Abdullayev Jamshid', phone: '+998901111111', region: 'Toshkent',  stir: '987654321', creditLimit: 10_000_000, paymentDays: 30 },
    { id: 'demo-contact-002', type: 'CUSTOMER' as const, name: 'Karimov Anvar',      phone: '+998902222222', region: 'Samarqand',                     creditLimit:  5_000_000, paymentDays: 14 },
    { id: 'demo-contact-003', type: 'CUSTOMER' as const, name: 'Nazarov Bekzod',     phone: '+998903333333', region: 'Toshkent',                      creditLimit:  8_000_000, paymentDays: 21 },
    { id: 'demo-contact-004', type: 'CUSTOMER' as const, name: 'Xolmatov Dilshod',   phone: '+998904444444', region: "Farg'ona",                      creditLimit:  3_000_000, paymentDays:  7 },
    { id: 'demo-contact-005', type: 'CUSTOMER' as const, name: 'Yusupov Mirzo',      phone: '+998905555555', region: 'Namangan',                      creditLimit: 15_000_000, paymentDays: 45 },
    { id: 'demo-contact-006', type: 'SUPPLIER' as const, name: 'Plastik Zavodi MChJ', legalName: "O'zbekiston Plastik Sanoati MChJ", phone: '+998712222222', region: 'Toshkent', stir: '111222333', paymentDays: 30 },
    { id: 'demo-contact-007', type: 'SUPPLIER' as const, name: 'Toza Chiqindi XK',    phone: '+998713333333', region: 'Toshkent', paymentDays: 14 },
    { id: 'demo-contact-008', type: 'SUPPLIER' as const, name: 'Himoya Qadoqlash',    phone: '+998714444444', region: 'Andijon',  paymentDays: 21 },
  ]

  for (const c of contacts) {
    await prisma.contact.upsert({
      where:  { id: c.id },
      update: {},
      create: { ...c, companyId: company.id } as any,
    })
  }

  const products = [
    { id: 'prod-001', code: 'PLT-001', name: 'Polipropilen qop 50kg',      category: 'Qoplar',     unit: 'dona', buyPrice: 2500,      sellPrice: 3200,     minStock: 500  },
    { id: 'prod-002', code: 'PLT-002', name: 'Polietilen qop 25kg',         category: 'Qoplar',     unit: 'dona', buyPrice: 1800,      sellPrice: 2400,     minStock: 300  },
    { id: 'prod-003', code: 'PLT-003', name: 'Big Bag (1 tonna)',           category: 'Qoplar',     unit: 'dona', buyPrice: 45000,     sellPrice: 58000,    minStock: 50   },
    { id: 'prod-004', code: 'GRN-001', name: 'Granula PP qayta ishlangan',  category: 'Granulalar', unit: 'kg',   buyPrice: 4200,      sellPrice: 5500,     minStock: 1000 },
    { id: 'prod-005', code: 'GRN-002', name: 'Granula PE qayta ishlangan',  category: 'Granulalar', unit: 'kg',   buyPrice: 3800,      sellPrice: 4900,     minStock: 800  },
    { id: 'prod-006', code: 'RAW-001', name: 'Chiqindi PP toza',            category: 'Xom ashyo',  unit: 'kg',   buyPrice: 1200,      sellPrice: 1800,     minStock: 2000 },
    { id: 'prod-007', code: 'RAW-002', name: 'Chiqindi PE aralash',         category: 'Xom ashyo',  unit: 'kg',   buyPrice: 800,       sellPrice: 1200,     minStock: 1500 },
    { id: 'prod-008', code: 'EQP-001', name: 'Qoplarni tikish mashinasi',   category: 'Jihozlar',   unit: 'dona', buyPrice: 3_500_000, sellPrice: 4_500_000, minStock: 0 },
    { id: 'prod-009', code: 'SRV-001', name: 'Qoplarni tikish xizmati',     category: 'Xizmatlar',  unit: 'dona', buyPrice: 0,         sellPrice: 500,      minStock: 0, isService: true },
    { id: 'prod-010', code: 'SRV-002', name: 'Yetkazib berish xizmati',     category: 'Xizmatlar',  unit: 'dona', buyPrice: 0,         sellPrice: 80000,    minStock: 0, isService: true },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where:  { id: p.id },
      update: {},
      create: {
        ...p,
        companyId: company.id,
        isService: (p as any).isService || false,
        minPrice:  Math.floor(p.sellPrice * 0.85),
      } as any,
    })
  }

  const mainWh = await prisma.warehouse.upsert({
    where:  { id: 'wh-001' },
    update: {},
    create: { id: 'wh-001', companyId: company.id, name: 'Asosiy ombor', address: 'Toshkent, Yunusobod t.', isDefault: true },
  })

  const secondWh = await prisma.warehouse.upsert({
    where:  { id: 'wh-002' },
    update: {},
    create: { id: 'wh-002', companyId: company.id, name: 'Tayyor mahsulot ombori', address: 'Toshkent, Chilonzor t.', isDefault: false },
  })

  const stockData = [
    { warehouseId: mainWh.id,   productId: 'prod-001', quantity: 1200 },
    { warehouseId: mainWh.id,   productId: 'prod-002', quantity: 850  },
    { warehouseId: mainWh.id,   productId: 'prod-003', quantity: 120  },
    { warehouseId: mainWh.id,   productId: 'prod-006', quantity: 3500 },
    { warehouseId: mainWh.id,   productId: 'prod-007', quantity: 1200 },
    { warehouseId: secondWh.id, productId: 'prod-004', quantity: 2800 },
    { warehouseId: secondWh.id, productId: 'prod-005', quantity: 1900 },
    { warehouseId: mainWh.id,   productId: 'prod-008', quantity: 1    },
  ]

  for (const s of stockData) {
    await prisma.stockItem.upsert({
      where:  { warehouseId_productId: { warehouseId: s.warehouseId, productId: s.productId } },
      update: { quantity: s.quantity },
      create: { ...s },
    }).catch(() => {})
  }

  const employees = [
    { id: 'emp-001', firstName: 'Bobur',   lastName: 'Mirzayev',  position: 'Omborchi',   department: 'Ombor',              type: 'PERMANENT', baseSalary: 2_500_000, dailyRate: 0       },
    { id: 'emp-002', firstName: 'Dilnoza', lastName: 'Qosimova',  position: 'Buxgalter',  department: 'Moliya',             type: 'PERMANENT', baseSalary: 3_000_000, dailyRate: 0       },
    { id: 'emp-003', firstName: 'Jasur',   lastName: 'Tursunov',  position: 'Sotuvchi',   department: 'Savdo',              type: 'PERMANENT', baseSalary: 2_000_000, dailyRate: 0       },
    { id: 'emp-004', firstName: 'Malika',  lastName: 'Ergasheva', position: 'Menejer',    department: 'Savdo',              type: 'PERMANENT', baseSalary: 3_500_000, dailyRate: 0       },
    { id: 'emp-005', firstName: 'Rustam',  lastName: 'Holiqov',   position: 'Ishchi',     department: 'Ishlab chiqarish',   type: 'DAILY',     baseSalary: 0,         dailyRate: 120_000 },
    { id: 'emp-006', firstName: 'Sherzod', lastName: 'Nazarov',   position: 'Ishchi',     department: 'Ishlab chiqarish',   type: 'DAILY',     baseSalary: 0,         dailyRate: 100_000 },
  ]

  const now = new Date()
  for (const e of employees) {
    await prisma.employee.upsert({
      where:  { id: e.id },
      update: {},
      create: {
        id:           e.id,
        companyId:    company.id,
        firstName:    e.firstName,
        lastName:     e.lastName,
        position:     e.position,
        department:   e.department,
        employeeType: e.type as any,
        baseSalary:   e.baseSalary,
        dailyRate:    e.dailyRate,
        hireDate:     new Date(now.getFullYear(), now.getMonth() - 6, 1),
      } as any,
    })
  }

  const permanent = ['emp-001', 'emp-002', 'emp-003', 'emp-004']
  const baseAmounts: Record<string, number> = { 'emp-001': 2_500_000, 'emp-002': 3_000_000, 'emp-003': 2_000_000, 'emp-004': 3_500_000 }

  for (const empId of permanent) {
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    const lastYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const bonus     = empId === 'emp-004' ? 500_000 : 0
    const advance   = empId === 'emp-003' ? 300_000 : 0

    await prisma.salaryRecord.upsert({
      where:  { employeeId_month_year: { employeeId: empId, month: lastMonth, year: lastYear } },
      update: {},
      create: {
        employeeId:  empId,
        month:       lastMonth,
        year:        lastYear,
        baseSalary:  baseAmounts[empId],
        bonus, deduction: 0, advance,
        totalAmount: baseAmounts[empId] + bonus - advance,
        isPaid:      true,
        paidAt:      new Date(),
      } as any,
    })

    await prisma.salaryRecord.upsert({
      where:  { employeeId_month_year: { employeeId: empId, month: now.getMonth() + 1, year: now.getFullYear() } },
      update: {},
      create: {
        employeeId:  empId,
        month:       now.getMonth() + 1,
        year:        now.getFullYear(),
        baseSalary:  baseAmounts[empId],
        bonus: 0, deduction: 0, advance: 0,
        totalAmount: baseAmounts[empId],
        isPaid:      false,
      } as any,
    })
  }

  const deals = [
    { id: 'deal-001', title: '500 dona PP qop yetkazish', contactId: 'demo-contact-001', stage: 'WON',         amount: 1_600_000, probability: 100, closedAt: new Date(now.getFullYear(), now.getMonth(), 5)  },
    { id: 'deal-002', title: 'Big Bag 50 dona',           contactId: 'demo-contact-002', stage: 'WON',         amount: 2_900_000, probability: 100, closedAt: new Date(now.getFullYear(), now.getMonth(), 10) },
    { id: 'deal-003', title: 'Granula PE 500 kg',         contactId: 'demo-contact-003', stage: 'NEGOTIATION', amount: 2_450_000, probability:  75 },
    { id: 'deal-004', title: 'PP qop yirik partiya',      contactId: 'demo-contact-004', stage: 'PROPOSAL',    amount: 4_800_000, probability:  50 },
    { id: 'deal-005', title: 'Granula PP 1 tonna',        contactId: 'demo-contact-005', stage: 'QUALIFIED',   amount: 5_500_000, probability:  25 },
    { id: 'deal-006', title: 'PE qop 200 dona',           contactId: 'demo-contact-001', stage: 'LEAD',        amount:   480_000, probability:  10 },
    { id: 'deal-007', title: 'Texnik xizmat',             contactId: 'demo-contact-002', stage: 'WON',         amount:   500_000, probability: 100, closedAt: new Date(now.getFullYear(), now.getMonth() - 1, 20) },
    { id: 'deal-008', title: 'PE qop yetkazib berish',    contactId: 'demo-contact-003', stage: 'LOST',        amount:   960_000, probability:   0, closedAt: new Date(now.getFullYear(), now.getMonth(), 1), lostReason: 'Narx kelishmadi' },
  ]

  for (const d of deals) {
    await prisma.deal.upsert({
      where:  { id: d.id },
      update: {},
      create: {
        ...d,
        companyId:   company.id,
        dealNumber:  `DEAL-${now.getFullYear()}-${d.id.split('-')[1]}`,
        discount:    0,
        finalAmount: d.amount,
        createdById: adminUser.id,
        stage:       d.stage as any,
      } as any,
    }).catch(() => {})
  }

  const debts = [
    { contactId: 'demo-contact-001', type: 'RECEIVABLE' as const, amount: 1_600_000, paidAmount:   800_000, remainAmount:   800_000, dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10) },
    { contactId: 'demo-contact-004', type: 'RECEIVABLE' as const, amount:   960_000, paidAmount:         0, remainAmount:   960_000, dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15), isOverdue: true },
    { contactId: 'demo-contact-006', type: 'PAYABLE'    as const, amount: 3_200_000, paidAmount: 1_600_000, remainAmount: 1_600_000, dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)  },
  ]

  for (const debt of debts) {
    await prisma.debtRecord.create({
      data: { companyId: company.id, ...debt } as any,
    }).catch(() => {})
  }

  const qualityTypes = [
    { id: 'qt-001', name: 'Toza PP',     expectedLossMin:  8, expectedLossMax: 18, buyPricePerKg: 1200, color: '#10B981' },
    { id: 'qt-002', name: 'Aralash PP',  expectedLossMin: 20, expectedLossMax: 35, buyPricePerKg:  900, color: '#F59E0B' },
    { id: 'qt-003', name: "Noto'za PE",  expectedLossMin: 30, expectedLossMax: 50, buyPricePerKg:  700, color: '#EF4444' },
  ]

  for (const qt of qualityTypes) {
    await prisma.wasteQualityType.upsert({
      where:  { id: qt.id },
      update: {},
      create: { ...qt, companyId: company.id } as any,
    }).catch(() => {})
  }

  const batches = [
    { id: 'batch-001', sourceType: 'SUPPLIER' as const, contactId: 'demo-contact-007', qualityTypeId: 'qt-001', inputWeight:  500, pricePerKg: 1200, status: 'COMPLETED'  as const },
    { id: 'batch-002', sourceType: 'CITIZEN'  as const, citizenName: 'Hamidov A.',      qualityTypeId: 'qt-002', inputWeight:  150, pricePerKg:  900, status: 'COMPLETED'  as const },
    { id: 'batch-003', sourceType: 'SUPPLIER' as const, contactId: 'demo-contact-008', qualityTypeId: 'qt-001', inputWeight:  800, pricePerKg: 1150, status: 'PROCESSING' as const },
    { id: 'batch-004', sourceType: 'CITIZEN'  as const, citizenName: 'Nazarov B.',      qualityTypeId: 'qt-003', inputWeight:  200, pricePerKg:  700, status: 'IN_STOCK'   as const },
    { id: 'batch-005', sourceType: 'SUPPLIER' as const, contactId: 'demo-contact-007', qualityTypeId: 'qt-002', inputWeight: 1000, pricePerKg:  880, status: 'IN_STOCK'   as const },
  ]

  for (const b of batches) {
    await prisma.wasteBatch.upsert({
      where:  { id: b.id },
      update: {},
      create: {
        id:           b.id,
        companyId:    company.id,
        sourceType:   b.sourceType,
        contactId:    (b as any).contactId || null,
        citizenName:  (b as any).citizenName || null,
        qualityTypeId: b.qualityTypeId,
        inputWeight:  b.inputWeight,
        pricePerKg:   b.pricePerKg,
        status:       b.status,
        batchNumber:  `WASTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${b.id.split('-')[1].padStart(4, '0')}`,
        totalCost:    b.inputWeight * b.pricePerKg,
        isPaid:       true,
        receivedAt:   new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdById:  adminUser.id,
      } as any,
    }).catch(() => {})
  }

  const processings = [
    { batchId: 'batch-001', processedWeight: 500, outputWeight: 428, lossWeight: 72, lossPercent: 14.4 },
    { batchId: 'batch-002', processedWeight: 150, outputWeight: 112, lossWeight: 38, lossPercent: 25.3 },
    { batchId: 'batch-003', processedWeight: 400, outputWeight: 348, lossWeight: 52, lossPercent: 13.0 },
  ]

  for (const p of processings) {
    await prisma.wasteProcessing.create({
      data: {
        companyId:       company.id,
        ...p,
        processedAt:     new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        createdById:     adminUser.id,
        outputProductId: 'prod-004',
      } as any,
    }).catch(() => {})
  }

  // ============================================
  // SUPER ADMIN (platform egasi uchun)
  // ============================================
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 12)

  // Super admin uchun maxsus "system" kompaniya kerak (FK constraint)
  const systemCompany = await prisma.company.upsert({
    where:  { id: 'system-company-000' },
    update: {},
    create: {
      id:    'system-company-000',
      name:  'Bizzo Platform',
      plan:  'ENTERPRISE',
    },
  })

  await prisma.user.upsert({
    where:  { id: 'super-admin-000' },
    update: {},
    create: {
      id:            'super-admin-000',
      companyId:     systemCompany.id,
      email:         'superadmin@bizzo.uz',
      passwordHash:  superAdminHash,
      firstName:     'Super',
      lastName:      'Admin',
      role:          'SUPER_ADMIN',
      isActive:      true,
      emailVerified: true,
    },
  })

  console.log('[seed] Demo data loaded.')
  console.log('       Admin:      admin@demo.uz      / Admin@123')
  console.log('       Manager:    manager@demo.uz    / Manager@123')
  console.log('       SuperAdmin: superadmin@bizzo.uz / SuperAdmin@123')
  console.log('       Company:    Toshmatov Savdo MChJ')
}

main()
  .catch((e) => { console.error('[seed] Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
