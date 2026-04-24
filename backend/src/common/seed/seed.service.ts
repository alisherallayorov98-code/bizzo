import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.seedCompanyAndAdmin()
      await this.seedDemoData()
    } catch (e) {
      this.logger.error('Seed failed:', e?.message)
    }
  }

  private async seedCompanyAndAdmin() {
    const existing = await this.prisma.user.findFirst({
      where: { email: 'admin@demo.uz' },
    })
    if (existing) return

    this.logger.log('Creating admin user...')

    const company = await this.prisma.company.upsert({
      where:  { id: 'demo-company-001' },
      update: {},
      create: {
        id:        'demo-company-001',
        name:      'Demo Kompaniya',
        currency:  'UZS',
        taxRegime: 'GENERAL',
      },
    })

    const hash = await bcrypt.hash('Admin@123', 12)
    await this.prisma.user.upsert({
      where:  { id: 'demo-user-admin' },
      update: {},
      create: {
        id:            'demo-user-admin',
        companyId:     company.id,
        email:         'admin@demo.uz',
        passwordHash:  hash,
        firstName:     'Admin',
        lastName:      'Demo',
        role:          'ADMIN',
        emailVerified: true,
      },
    })
    this.logger.log('Admin created — admin@demo.uz / Admin@123')
  }

  private async seedDemoData() {
    const CID = 'demo-company-001'

    // Allaqachon demo ma'lumotlar bormi?
    const hasContacts = await this.prisma.contact.count({ where: { companyId: CID } })
    if (hasContacts > 0) return

    this.logger.log('Seeding demo contacts, products, warehouse, employees...')

    // ---- KONTAKTLAR ----
    const contacts = await Promise.all([
      this.prisma.contact.create({ data: { companyId: CID, type: 'CUSTOMER', name: 'Akmal Toshmatov',   phone: '+998901234567', email: 'akmal@example.uz',   region: 'Toshkent',    address: 'Yunusobod 5-kv', creditLimit: 5_000_000 } }),
      this.prisma.contact.create({ data: { companyId: CID, type: 'CUSTOMER', name: 'Sarvinoz Yusupova', phone: '+998912345678', email: 'sarvinoz@example.uz', region: 'Samarqand',   address: "Registon ko'chasi 12", creditLimit: 3_000_000 } }),
      this.prisma.contact.create({ data: { companyId: CID, type: 'CUSTOMER', name: 'Bobur Rahimov',     phone: '+998903456789', email: 'bobur@example.uz',    region: 'Farg`ona',    address: "Markaziy ko'cha 7", creditLimit: 8_000_000 } }),
      this.prisma.contact.create({ data: { companyId: CID, type: 'SUPPLIER', name: 'UzTekstil Zavodi', phone: '+998712223344', email: 'info@uztekstil.uz',   region: 'Toshkent',    address: 'Sanoat 1', legalName: 'UzTekstil MChJ' } }),
      this.prisma.contact.create({ data: { companyId: CID, type: 'SUPPLIER', name: 'Elektr Bozor',      phone: '+998713334455', email: 'info@elektrbozor.uz', region: 'Andijon',     address: 'Bozor 3', legalName: 'Elektr Bozor AJ' } }),
    ])

    // ---- MAHSULOTLAR ----
    const products = await Promise.all([
      this.prisma.product.create({ data: { companyId: CID, code: 'P001', name: 'Laptop Lenovo IdeaPad', category: 'Elektronika', unit: 'dona', buyPrice: 6_500_000, sellPrice: 7_800_000, minStock: 3 } }),
      this.prisma.product.create({ data: { companyId: CID, code: 'P002', name: 'Printer Canon MG2540', category: 'Elektronika', unit: 'dona', buyPrice: 980_000,   sellPrice: 1_200_000, minStock: 2 } }),
      this.prisma.product.create({ data: { companyId: CID, code: 'P003', name: "A4 Qog'oz (500 vaq)",  category: 'Ofis',        unit: 'paket', buyPrice: 45_000,   sellPrice: 58_000,    minStock: 20 } }),
      this.prisma.product.create({ data: { companyId: CID, code: 'P004', name: 'Office 365 (1 yil)',   category: 'Dasturiy ta\'minot', unit: 'litsenziya', buyPrice: 320_000, sellPrice: 450_000, minStock: 0, isService: true } }),
      this.prisma.product.create({ data: { companyId: CID, code: 'P005', name: 'USB Flash 32GB',       category: 'Elektronika', unit: 'dona', buyPrice: 38_000,   sellPrice: 55_000,    minStock: 10 } }),
      this.prisma.product.create({ data: { companyId: CID, code: 'P006', name: 'Ofis stuli (Mesh)',    category: 'Mebel',       unit: 'dona', buyPrice: 850_000,  sellPrice: 1_100_000, minStock: 1 } }),
    ])

    // ---- OMBOR ----
    const warehouse = await this.prisma.warehouse.create({
      data: { companyId: CID, name: 'Asosiy ombor', address: 'Toshkent, Mirzo Ulugbek', isDefault: true },
    })

    // StockItem va kirish harakatlarini qo'shish (faqat jismoniy mahsulotlar)
    const physicalItems = [
      { product: products[0], qty: 12 },  // Laptop
      { product: products[1], qty: 5  },  // Printer
      { product: products[2], qty: 80 },  // A4 qog'oz
      { product: products[4], qty: 35 },  // USB Flash
      { product: products[5], qty: 4  },  // Stul
    ]

    for (const { product, qty } of physicalItems) {
      await this.prisma.stockItem.create({
        data: {
          warehouseId: warehouse.id,
          productId:   product.id,
          quantity:    qty,
        },
      })
      await this.prisma.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          productId:   product.id,
          type:        'IN',
          quantity:    qty,
          totalAmount: parseFloat(product.buyPrice.toString()) * qty,
          reason:      'Boshlang`ich qoldiq',
          createdAt:   new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      })
    }

    // ---- XODIMLAR ----
    const employees = await Promise.all([
      this.prisma.employee.create({ data: { companyId: CID, firstName: 'Jasur',   lastName: 'Nazarov',   phone: '+998901111111', position: 'Menejer',         department: 'Savdo',    employeeType: 'PERMANENT', baseSalary: 4_500_000, hireDate: new Date('2023-03-01'), isActive: true } }),
      this.prisma.employee.create({ data: { companyId: CID, firstName: 'Dilnoza', lastName: 'Karimova',  phone: '+998902222222', position: 'Buxgalter',        department: 'Moliya',   employeeType: 'PERMANENT', baseSalary: 3_800_000, hireDate: new Date('2022-09-15'), isActive: true } }),
      this.prisma.employee.create({ data: { companyId: CID, firstName: 'Sanjar',  lastName: 'Mirzayev', phone: '+998903333333', position: 'Dasturchi',        department: 'IT',       employeeType: 'PERMANENT', baseSalary: 6_000_000, hireDate: new Date('2024-01-10'), isActive: true } }),
      this.prisma.employee.create({ data: { companyId: CID, firstName: 'Hulkar',  lastName: 'Tursunova', phone: '+998904444444', position: 'Omborchi',         department: 'Ombor',    employeeType: 'PERMANENT', baseSalary: 2_800_000, hireDate: new Date('2023-07-20'), isActive: true } }),
      this.prisma.employee.create({ data: { companyId: CID, firstName: 'Olim',    lastName: 'Xoliqov',  phone: '+998905555555', position: 'Haydovchi',        department: 'Logistika',employeeType: 'DAILY',     dailyRate:  80_000,    hireDate: new Date('2024-02-01'), isActive: true } }),
    ])

    // Ish haqi yozuvlari (1 oy uchun)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    for (const emp of employees.filter(e => e.employeeType === 'PERMANENT')) {
      await this.prisma.salaryRecord.create({
        data: {
          employeeId:  emp.id,
          month:       lastMonth.getMonth() + 1,
          year:        lastMonth.getFullYear(),
          baseSalary:  emp.baseSalary,
          bonus:       0,
          deduction:   0,
          advance:     0,
          totalAmount: emp.baseSalary,
          isPaid:      true,
          paidAt:      new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 28),
        },
      })
    }

    // ---- DEALLAR (WON) ----
    const dealDates = [-5, -12, -18, -25, -35, -42]
    for (let i = 0; i < 6; i++) {
      const closedAt  = new Date(Date.now() + dealDates[i] * 24 * 60 * 60 * 1000)
      const contact   = contacts[i % 3]   // faqat mijozlar
      const product1  = products[i % products.length]
      const product2  = products[(i + 1) % products.length]
      const qty1      = Math.floor(Math.random() * 3) + 1
      const qty2      = Math.floor(Math.random() * 2) + 1
      const amount1   = parseFloat(product1.sellPrice.toString()) * qty1
      const amount2   = parseFloat(product2.sellPrice.toString()) * qty2
      const total     = amount1 + amount2

      const deal = await this.prisma.deal.create({
        data: {
          companyId:    CID,
          contactId:    contact.id,
          dealNumber:   `D-2025-${String(i + 1).padStart(3, '0')}`,
          title:        `${contact.name} buyurtmasi`,
          stage:        'WON',
          amount:       total,
          discount:     0,
          finalAmount:  total,
          closedAt,
          createdAt:    new Date(closedAt.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      })

      await this.prisma.dealItem.createMany({
        data: [
          { dealId: deal.id, name: product1.name, quantity: qty1, price: product1.sellPrice, discount: 0, totalPrice: amount1 },
          { dealId: deal.id, name: product2.name, quantity: qty2, price: product2.sellPrice, discount: 0, totalPrice: amount2 },
        ],
      })
    }

    // ---- QARZLAR ----
    await this.prisma.debtRecord.createMany({
      data: [
        { companyId: CID, contactId: contacts[0].id, type: 'RECEIVABLE', amount: 2_400_000, remainAmount: 2_400_000, notes: 'Laptop uchun to`lov', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { companyId: CID, contactId: contacts[1].id, type: 'RECEIVABLE', amount: 1_200_000, remainAmount:   600_000, notes: 'Qisman to`langan',    dueDate: new Date(Date.now() + 7  * 24 * 60 * 60 * 1000) },
        { companyId: CID, contactId: contacts[3].id, type: 'PAYABLE',    amount: 980_000,  remainAmount:   980_000, notes: 'Tovar uchun qarz',     dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) },
      ],
    })

    this.logger.log('Demo data seeded: 5 contacts, 6 products, 1 warehouse, 5 employees, 6 deals, 3 debts')
  }
}
