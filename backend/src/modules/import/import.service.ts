import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService }  from '../../prisma/prisma.service'
import { DedupService }   from './dedup.service'
import { SnapshotService } from './snapshot.service'
import {
  RawRow, ColumnMapping, COLUMN_PATTERNS,
  ImportContactRow, ImportProductRow, ImportDebtRow,
  ImportStockRow, ImportEmployeeRow, ImportDealRow,
  ImportEntity,
} from './import.types'

export interface ImportResult {
  sessionId:  string
  entity:     ImportEntity
  created:    number
  updated:    number
  skipped:    number
  errors:     number
  duplicates: number
  rows:       Array<{ index: number; action: string; message?: string; id?: string }>
}

@Injectable()
export class ImportService {
  constructor(
    private prisma:    PrismaService,
    private dedup:     DedupService,
    private snapshots: SnapshotService,
  ) {}

  // ──────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────
  async createSession(companyId: string, name: string, source = 'EXCEL') {
    const snapshotId = await this.snapshots.takeSnapshot(companyId)
    return this.prisma.migrationSession.create({
      data: { companyId, name, source, snapshotId },
    })
  }

  async getSession(sessionId: string) {
    return this.prisma.migrationSession.findUnique({
      where:   { id: sessionId },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 100 } },
    })
  }

  async getSessions(companyId: string) {
    return this.prisma.migrationSession.findMany({
      where:   { companyId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getMigrationProgress(companyId: string) {
    const sessions = await this.prisma.migrationSession.findMany({
      where: { companyId, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
    })

    const progress: Record<string, { imported: number; total: number; pct: number }> = {}
    const entities: ImportEntity[] = ['contact', 'product', 'debt', 'stock', 'employee', 'deal']

    for (const entity of entities) {
      const imported = await this.prisma.migrationLog.count({
        where: { session: { companyId }, entity, action: 'created' },
      })
      progress[entity] = { imported, total: imported, pct: imported > 0 ? 100 : 0 }
    }

    // DB dagi haqiqiy sonlar bilan solishtirish
    const [contacts, products, debts, employees] = await Promise.all([
      this.prisma.contact.count({ where: { companyId } }),
      this.prisma.product.count({ where: { companyId } }),
      this.prisma.debtRecord.count({ where: { companyId } }),
      this.prisma.employee.count({ where: { companyId } }),
    ])

    return {
      sessions: sessions.length,
      entities: { contacts, products, debts, employees },
      importLog: progress,
    }
  }

  // ──────────────────────────────────────────────
  // AQLLI USTUN ANIQLASH
  // ──────────────────────────────────────────────
  detectColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {}
    for (const header of headers) {
      for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (patterns.some(p => p.test(header.trim()))) {
          mapping[header] = field
          break
        }
      }
    }
    return mapping
  }

  // Raw qatorni field nomlariga aylantirish
  applyMapping(row: RawRow, mapping: ColumnMapping): RawRow {
    const result: RawRow = {}
    for (const [src, target] of Object.entries(mapping)) {
      if (src in row) result[target] = row[src]
    }
    return result
  }

  // ──────────────────────────────────────────────
  // PREVIEW (import qilmasdan tekshirish)
  // ──────────────────────────────────────────────
  async previewImport(companyId: string, entity: ImportEntity, rows: RawRow[], mapping: ColumnMapping) {
    const preview = []
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const mapped = this.applyMapping(rows[i], mapping)
      const result: any = { index: i + 1, raw: rows[i], mapped, issues: [] }

      if (entity === 'contact') {
        if (!mapped['name']) result.issues.push('Ism/nomi majburiy')
        const dup = await this.dedup.findContactMatch(companyId, {
          name: String(mapped['name'] || ''),
          phone: mapped['phone'] ? String(mapped['phone']) : undefined,
          stir:  mapped['stir']  ? String(mapped['stir'])  : undefined,
        })
        if (dup) result.duplicate = dup
      } else if (entity === 'product') {
        if (!mapped['name']) result.issues.push('Mahsulot nomi majburiy')
        const dup = await this.dedup.findProductMatch(companyId, {
          name:    String(mapped['name'] || ''),
          code:    mapped['code']    ? String(mapped['code'])    : undefined,
          barcode: mapped['barcode'] ? String(mapped['barcode']) : undefined,
        })
        if (dup) result.duplicate = dup
      } else if (entity === 'debt') {
        if (!mapped['contactName']) result.issues.push('Kontragent nomi majburiy')
        if (!mapped['amount'])      result.issues.push('Summa majburiy')
      } else if (entity === 'stock') {
        if (!mapped['productName']) result.issues.push('Mahsulot nomi majburiy')
        if (!mapped['quantity'])    result.issues.push('Miqdor majburiy')
      } else if (entity === 'employee') {
        if (!mapped['firstName']) result.issues.push('Ism majburiy')
        if (!mapped['lastName'])  result.issues.push('Familiya majburiy')
      }

      preview.push(result)
    }
    return { total: rows.length, preview }
  }

  // ──────────────────────────────────────────────
  // IMPORT: KONTAKTLAR
  // ──────────────────────────────────────────────
  async importContacts(companyId: string, sessionId: string, rows: ImportContactRow[], dupStrategy: 'skip' | 'update' | 'merge' = 'skip'): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'contact', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: 'Ism bo\'sh' })
        continue
      }

      try {
        const dup = await this.dedup.findContactMatch(companyId, {
          name: row.name, phone: row.phone, stir: row.stir, email: row.email,
        })

        if (dup) {
          result.duplicates++
          if (dupStrategy === 'skip') {
            result.skipped++
            result.rows.push({ index: i + 1, action: 'skipped', message: `Takror (${dup.matchedBy}, ${dup.confidence}%)`, id: dup.internalId })
            await this.logRow(sessionId, 'contact', 'skipped', i + 1, null, dup.internalId, `Takror: ${dup.matchedBy}`)
            continue
          } else if (dupStrategy === 'update' || dupStrategy === 'merge') {
            await this.prisma.contact.update({
              where: { id: dup.internalId },
              data: {
                phone:   row.phone   || undefined,
                email:   row.email   || undefined,
                address: row.address || undefined,
                stir:    row.stir    || undefined,
                region:  row.region  || undefined,
              },
            })
            result.updated++
            result.rows.push({ index: i + 1, action: 'updated', id: dup.internalId })
            await this.logRow(sessionId, 'contact', 'updated', i + 1, null, dup.internalId)
            continue
          }
        }

        const type = this.normalizeContactType(row.type)
        const contact = await this.prisma.contact.create({
          data: {
            companyId,
            name:    row.name.trim(),
            type,
            phone:   row.phone   || null,
            email:   row.email   || null,
            address: row.address || null,
            stir:    row.stir    || null,
            region:  row.region  || null,
            notes:   row.notes   || null,
          },
        })

        // Ochilish qarzi
        if (row.openingDebtAmount && Number(row.openingDebtAmount) > 0) {
          const debtType = row.openingDebtType?.toUpperCase() === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE'
          const amount   = Number(row.openingDebtAmount)
          await this.prisma.debtRecord.create({
            data: {
              companyId,
              contactId:    contact.id,
              type:         debtType as any,
              amount,
              paidAmount:   0,
              remainAmount: amount,
              dueDate:      row.openingDebtDate ? new Date(row.openingDebtDate) : null,
              notes:        'Import orqali kiritilgan ochilish qarzi',
              referenceType: 'IMPORT',
            },
          })
        }

        result.created++
        result.rows.push({ index: i + 1, action: 'created', id: contact.id })
        await this.logRow(sessionId, 'contact', 'created', i + 1, null, contact.id)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
        await this.logRow(sessionId, 'contact', 'error', i + 1, null, null, e.message)
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // IMPORT: MAHSULOTLAR
  // ──────────────────────────────────────────────
  async importProducts(companyId: string, sessionId: string, rows: ImportProductRow[], dupStrategy: 'skip' | 'update' = 'skip'): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'product', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    // Default warehouse topish
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { companyId, isDefault: true },
    }) || await this.prisma.warehouse.findFirst({ where: { companyId } })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) { result.errors++; continue }

      try {
        const dup = await this.dedup.findProductMatch(companyId, {
          name: row.name, code: row.code, barcode: row.barcode,
        })

        if (dup) {
          result.duplicates++
          if (dupStrategy === 'skip') {
            result.skipped++
            result.rows.push({ index: i + 1, action: 'skipped', id: dup.internalId })
            await this.logRow(sessionId, 'product', 'skipped', i + 1, null, dup.internalId)
            continue
          } else {
            await this.prisma.product.update({
              where: { id: dup.internalId },
              data: {
                buyPrice:  row.buyPrice  ? row.buyPrice  : undefined,
                sellPrice: row.sellPrice ? row.sellPrice : undefined,
                minStock:  row.minStock  ? row.minStock  : undefined,
                category:  row.category  || undefined,
              },
            })
            result.updated++
            result.rows.push({ index: i + 1, action: 'updated', id: dup.internalId })
            await this.logRow(sessionId, 'product', 'updated', i + 1, null, dup.internalId)
            continue
          }
        }

        const product = await this.prisma.product.create({
          data: {
            companyId,
            name:      row.name.trim(),
            code:      row.code      || null,
            barcode:   row.barcode   || null,
            category:  row.category  || null,
            unit:      row.unit      || 'dona',
            buyPrice:  row.buyPrice  || 0,
            sellPrice: row.sellPrice || 0,
            minPrice:  row.minPrice  || 0,
            minStock:  row.minStock  || 0,
          },
        })

        // Boshlang'ich qoldiq
        if (warehouse && row.openingStock && Number(row.openingStock) > 0) {
          await this.prisma.stockItem.upsert({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
            update: { quantity: { increment: Number(row.openingStock) } },
            create: {
              warehouseId: warehouse.id,
              productId:   product.id,
              quantity:    Number(row.openingStock),
              avgPrice:    row.openingAvgPrice || row.buyPrice || 0,
            },
          })
          await this.prisma.stockMovement.create({
            data: {
              warehouseId: warehouse.id,
              productId:   product.id,
              type:        'IN',
              quantity:    Number(row.openingStock),
              price:       row.openingAvgPrice || row.buyPrice || 0,
              totalAmount: Number(row.openingStock) * (row.openingAvgPrice || row.buyPrice || 0),
              reason:      'Import — boshlang\'ich qoldiq',
              referenceType: 'IMPORT',
            },
          })
        }

        result.created++
        result.rows.push({ index: i + 1, action: 'created', id: product.id })
        await this.logRow(sessionId, 'product', 'created', i + 1, null, product.id)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
        await this.logRow(sessionId, 'product', 'error', i + 1, null, null, e.message)
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // IMPORT: QARZLAR
  // ──────────────────────────────────────────────
  async importDebts(companyId: string, sessionId: string, rows: ImportDebtRow[]): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'debt', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.contactName?.trim() || !row.amount) { result.errors++; continue }

      try {
        // Kontaktni topish yoki yaratish
        let contact = await this.prisma.contact.findFirst({
          where: { companyId, name: { contains: row.contactName.trim(), mode: 'insensitive' } },
        })
        if (!contact && row.contactPhone) {
          contact = await this.prisma.contact.findFirst({
            where: { companyId, phone: { contains: row.contactPhone.slice(-9) } },
          })
        }
        if (!contact) {
          contact = await this.prisma.contact.create({
            data: { companyId, name: row.contactName.trim(), type: 'BOTH', phone: row.contactPhone || null },
          })
        }

        const amount      = Number(row.amount)
        const paidAmount  = Number(row.paidAmount || 0)
        const remainAmount = amount - paidAmount
        const debtType    = row.type?.toUpperCase() === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE'

        const debt = await this.prisma.debtRecord.create({
          data: {
            companyId,
            contactId:    contact.id,
            type:         debtType as any,
            amount,
            paidAmount,
            remainAmount,
            currency:     row.currency || 'UZS',
            dueDate:      row.dueDate ? new Date(row.dueDate) : null,
            isOverdue:    row.dueDate ? new Date(row.dueDate) < new Date() : false,
            notes:        row.notes || 'Import orqali kiritilgan',
            referenceType: 'IMPORT',
          },
        })

        result.created++
        result.rows.push({ index: i + 1, action: 'created', id: debt.id })
        await this.logRow(sessionId, 'debt', 'created', i + 1, null, debt.id)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // IMPORT: OMBOR QOLDIQLARI
  // ──────────────────────────────────────────────
  async importStock(companyId: string, sessionId: string, rows: ImportStockRow[]): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'stock', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { companyId, isDefault: true },
    }) || await this.prisma.warehouse.findFirst({ where: { companyId } })

    if (!defaultWarehouse) {
      throw new BadRequestException('Avval kamida bitta omborxona yarating')
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.productName?.trim() || !row.quantity) { result.errors++; continue }

      try {
        const dup = await this.dedup.findProductMatch(companyId, {
          name: row.productName, code: row.productCode,
        })

        let productId: string
        if (dup) {
          productId = dup.internalId
        } else {
          const p = await this.prisma.product.create({
            data: {
              companyId,
              name:  row.productName.trim(),
              code:  row.productCode || null,
              unit:  'dona',
              buyPrice: row.avgPrice || 0,
              sellPrice: 0,
              minPrice: 0,
              minStock: 0,
            },
          })
          productId = p.id
        }

        const warehouseId = defaultWarehouse.id
        await this.prisma.stockItem.upsert({
          where:  { warehouseId_productId: { warehouseId, productId } },
          update: { quantity: Number(row.quantity), avgPrice: row.avgPrice || 0 },
          create: { warehouseId, productId, quantity: Number(row.quantity), avgPrice: row.avgPrice || 0 },
        })

        await this.prisma.stockMovement.create({
          data: {
            warehouseId, productId,
            type:        'IN',
            quantity:    Number(row.quantity),
            price:       row.avgPrice || 0,
            totalAmount: Number(row.quantity) * (row.avgPrice || 0),
            reason:      'Import — boshlang\'ich qoldiq',
            referenceType: 'IMPORT',
          },
        })

        result.created++
        result.rows.push({ index: i + 1, action: 'created' })
        await this.logRow(sessionId, 'stock', 'created', i + 1)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // IMPORT: XODIMLAR
  // ──────────────────────────────────────────────
  async importEmployees(companyId: string, sessionId: string, rows: ImportEmployeeRow[]): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'employee', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.firstName?.trim() || !row.lastName?.trim()) { result.errors++; continue }

      try {
        const existing = await this.prisma.employee.findFirst({
          where: {
            companyId,
            firstName: { equals: row.firstName.trim(), mode: 'insensitive' },
            lastName:  { equals: row.lastName.trim(),  mode: 'insensitive' },
          },
        })

        if (existing) {
          result.duplicates++
          result.skipped++
          result.rows.push({ index: i + 1, action: 'skipped', id: existing.id })
          continue
        }

        const employee = await this.prisma.employee.create({
          data: {
            companyId,
            firstName:    row.firstName.trim(),
            lastName:     row.lastName.trim(),
            position:     row.position   || null,
            department:   row.department || null,
            phone:        row.phone      || null,
            hireDate:     row.hireDate   ? new Date(row.hireDate) : new Date(),
            baseSalary:   row.baseSalary || 0,
            employeeType: (row.employeeType as any) || 'PERMANENT',
            isActive:     true,
          },
        })

        result.created++
        result.rows.push({ index: i + 1, action: 'created', id: employee.id })
        await this.logRow(sessionId, 'employee', 'created', i + 1, null, employee.id)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // IMPORT: BITIMLAR (DEALS)
  // ──────────────────────────────────────────────
  async importDeals(companyId: string, sessionId: string, rows: any[]): Promise<ImportResult> {
    const result: ImportResult = { sessionId, entity: 'deal', created: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0, rows: [] }

    const year  = new Date().getFullYear()
    let counter = await this.prisma.deal.count({ where: { companyId } })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const contactName = (row.contactName || row['Kontragent'] || '').trim()
      const amountRaw   = row.amount ?? row['Summa']
      const amount      = parseFloat(String(amountRaw ?? 0)) || 0

      if (!contactName) { result.errors++; result.rows.push({ index: i + 1, action: 'error', message: 'Kontragent nomi kerak' }); continue }
      if (!amount)      { result.errors++; result.rows.push({ index: i + 1, action: 'error', message: 'Summa kerak' }); continue }

      try {
        // Find or create contact
        let contact = await this.prisma.contact.findFirst({
          where: { companyId, name: { equals: contactName, mode: 'insensitive' } },
        })
        if (!contact) {
          contact = await this.prisma.contact.create({
            data: { companyId, name: contactName, type: 'CUSTOMER' },
          })
        }

        // Normalize stage
        const stageRaw = (row.stage ?? row['Bosqich'] ?? 'WON').toString().toUpperCase()
        const VALID_STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
        const stage = VALID_STAGES.includes(stageRaw) ? stageRaw : 'WON'

        counter++
        const dealNumber = `DEAL-${year}-${String(counter).padStart(4, '0')}`

        const closedAtRaw = row.closedAt ?? row['Yopilgan sana']
        const closedAt    = closedAtRaw ? new Date(closedAtRaw) : (stage === 'WON' || stage === 'LOST' ? new Date() : null)

        const deal = await this.prisma.deal.create({
          data: {
            companyId,
            contactId:   contact.id,
            dealNumber,
            title:       (row.title ?? row['Sarlavha'] ?? `${contactName} — import`) as string,
            amount,
            finalAmount: amount,
            stage:       stage as any,
            notes:       (row.notes ?? row['Izoh'] ?? null) as string | null,
            closedAt,
            probability: stage === 'WON' ? 100 : stage === 'LOST' ? 0 : 50,
          },
        })

        result.created++
        result.rows.push({ index: i + 1, action: 'created', id: deal.id })
        await this.logRow(sessionId, 'deal', 'created', i + 1, null, deal.id)
      } catch (e: any) {
        result.errors++
        result.rows.push({ index: i + 1, action: 'error', message: e.message })
        await this.logRow(sessionId, 'deal', 'error', i + 1, null, null, e.message)
      }
    }

    await this.updateSessionStats(sessionId, result)
    return result
  }

  // ──────────────────────────────────────────────
  // RECONCILIATION REPORT
  // ──────────────────────────────────────────────
  async getReconciliationReport(companyId: string, sessionId: string) {
    const session = await this.prisma.migrationSession.findUnique({
      where: { id: sessionId },
    })
    if (!session) throw new BadRequestException('Session topilmadi')

    const logs = await this.prisma.migrationLog.findMany({
      where: { sessionId },
    })

    const byEntity: Record<string, { created: number; updated: number; skipped: number; errors: number }> = {}
    for (const log of logs) {
      if (!byEntity[log.entity]) byEntity[log.entity] = { created: 0, updated: 0, skipped: 0, errors: 0 }
      if (log.action in byEntity[log.entity]) {
        (byEntity[log.entity] as any)[log.action]++
      }
    }

    // Data quality tekshirish
    const issues: string[] = []

    const [dupPhones, missingPrice, overdueDebts] = await Promise.all([
      this.prisma.contact.groupBy({
        by: ['phone'], where: { companyId, phone: { not: null } },
        having: { phone: { _count: { gt: 1 } } },
        _count: { phone: true },
      }),
      this.prisma.product.count({ where: { companyId, sellPrice: 0 } }),
      this.prisma.debtRecord.count({ where: { companyId, isOverdue: true } }),
    ])

    if (dupPhones.length > 0)  issues.push(`${dupPhones.length} ta kontaktda takroriy telefon raqami`)
    if (missingPrice > 0)      issues.push(`${missingPrice} ta mahsulotda sotish narxi ko'rsatilmagan`)
    if (overdueDebts > 0)      issues.push(`${overdueDebts} ta muddati o'tgan qarz mavjud`)

    const totalImported  = logs.filter(l => l.action === 'created').length
    const totalSkipped   = logs.filter(l => l.action === 'skipped').length
    const totalErrors    = logs.filter(l => l.action === 'error').length
    const qualityScore   = totalImported > 0
      ? Math.round(((totalImported - totalErrors) / Math.max(totalImported + totalErrors, 1)) * 100)
      : 0

    return {
      session,
      byEntity,
      summary: { totalImported, totalSkipped, totalErrors, qualityScore },
      issues,
    }
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async logRow(
    sessionId: string, entity: string, action: string,
    rowIndex?: number, externalId?: string | null, internalId?: string | null, message?: string,
  ) {
    await this.prisma.migrationLog.create({
      data: { sessionId, entity, action, rowIndex, externalId, internalId, message },
    }).catch(() => {})
  }

  private async updateSessionStats(sessionId: string, result: ImportResult) {
    await this.prisma.migrationSession.update({
      where: { id: sessionId },
      data: {
        importedRows: { increment: result.created },
        skippedRows:  { increment: result.skipped },
        errorRows:    { increment: result.errors },
        duplicatesFound: { increment: result.duplicates },
        totalRows:    { increment: result.created + result.skipped + result.errors },
        status: 'IN_PROGRESS',
      },
    }).catch(() => {})
  }

  // ──────────────────────────────────────────────
  // 1C XML FORMAT PARSER (CommerceML 2.x)
  // ──────────────────────────────────────────────
  parse1CXml(xml: string): { entity: string; rows: any[] } {
    const getTag  = (src: string, tag: string): string => {
      const m = src.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
      return m ? m[1].trim() : ''
    }
    const getBlock = (src: string, tag: string): string[] => {
      const out: string[] = []
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'ig')
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) !== null) out.push(m[0])
      return out
    }

    // ── Products: <Товар> or <Номенклатура> ──
    const productBlocks = [...getBlock(xml, 'Товар'), ...getBlock(xml, 'Номенклатура')]
    if (productBlocks.length > 0) {
      const rows = productBlocks.map(block => {
        const name     = getTag(block, 'Наименование') || getTag(block, 'НаименованиеПолное')
        const code     = getTag(block, 'Артикул') || getTag(block, 'Код')
        const barcode  = getTag(block, 'Штрихкод')
        const unit     = getTag(block, 'БазоваяЕдиница') || getTag(block, 'ЕдиницаИзмерения') || 'dona'
        const buyPrice = parseFloat(getTag(block, 'ЦенаЗакупки') || getTag(block, 'Себестоимость') || '0') || 0
        const sellPrice = parseFloat(getTag(block, 'ЦенаПродажи') || getTag(block, 'Цена') || '0') || 0
        const category = getTag(block, 'Группа') || getTag(block, 'Категория')
        const qty      = parseFloat(getTag(block, 'Количество') || '0') || 0

        return {
          name: name || undefined,
          code: code || undefined,
          barcode: barcode || undefined,
          unit: unit !== 'dona' ? unit : undefined,
          buyPrice: buyPrice || undefined,
          sellPrice: sellPrice || undefined,
          category: category || undefined,
          openingStock: qty || undefined,
          openingAvgPrice: buyPrice || undefined,
        }
      }).filter(r => r.name)

      return { entity: 'product', rows }
    }

    // ── Contacts: <Контрагент> or <Партнер> ──
    const contactBlocks = [...getBlock(xml, 'Контрагент'), ...getBlock(xml, 'Партнер')]
    if (contactBlocks.length > 0) {
      const rows = contactBlocks.map(block => {
        const name    = getTag(block, 'Наименование') || getTag(block, 'НаименованиеПолное')
        const stir    = getTag(block, 'ИНН')
        const phone   = getTag(block, 'Телефон') || getTag(block, 'НомерТелефона')
        const email   = getTag(block, 'ЭлектроннаяПочта') || getTag(block, 'Email')
        const address = getTag(block, 'Адрес') || getTag(block, 'ЮридическийАдрес')
        const typeRaw = getTag(block, 'ТипКонтрагента') || ''
        const type    = typeRaw.toLowerCase().includes('поставщик') ? 'SUPPLIER'
                      : typeRaw.toLowerCase().includes('покупател') ? 'CUSTOMER'
                      : undefined

        return {
          name: name || undefined,
          stir: stir || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          type,
        }
      }).filter(r => r.name)

      return { entity: 'contact', rows }
    }

    // ── Employees: <Сотрудник> ──
    const empBlocks = getBlock(xml, 'Сотрудник')
    if (empBlocks.length > 0) {
      const rows = empBlocks.map(block => {
        const fullName  = getTag(block, 'Наименование') || getTag(block, 'ФИО')
        const parts     = fullName.split(/\s+/)
        const firstName = parts[1] || parts[0] || ''
        const lastName  = parts[0] || ''
        const position  = getTag(block, 'Должность')
        const phone     = getTag(block, 'Телефон')
        const salary    = parseFloat(getTag(block, 'Оклад') || '0') || 0

        return {
          firstName: firstName || undefined,
          lastName:  lastName  || undefined,
          position:  position  || undefined,
          phone:     phone     || undefined,
          baseSalary: salary   || undefined,
        }
      }).filter(r => r.firstName)

      return { entity: 'employee', rows }
    }

    return { entity: 'unknown', rows: [] }
  }

  private normalizeContactType(type?: string): 'CUSTOMER' | 'SUPPLIER' | 'BOTH' {
    if (!type) return 'CUSTOMER'
    const t = type.toUpperCase()
    if (t.includes('SUPPLIER') || t.includes('YETKAZUVCHI') || t.includes('ПОСТАВЩИК')) return 'SUPPLIER'
    if (t.includes('BOTH') || t.includes('IKKALASI') || t.includes('ОБА')) return 'BOTH'
    return 'CUSTOMER'
  }
}
