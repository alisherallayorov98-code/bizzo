import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  async openShift(companyId: string, userId: string, openingCash: number) {
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM "pos_shifts"
      WHERE "companyId" = ${companyId} AND "userId" = ${userId} AND "closedAt" IS NULL
      LIMIT 1
    `.catch(() => [])

    if (existing?.length) throw new BadRequestException('Smena allaqachon ochiq')

    await this.prisma.$executeRaw`
      INSERT INTO "pos_shifts" (id, "companyId", "userId", "openingCash", "openedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${companyId}, ${userId}, ${openingCash}, NOW(), NOW(), NOW())
    `
    return { ok: true }
  }

  async getCurrentShift(companyId: string, userId: string) {
    const shifts = await this.prisma.$queryRaw<any[]>`
      SELECT ps.*, u."firstName" || ' ' || u."lastName" AS "userName"
      FROM "pos_shifts" ps
      JOIN "users" u ON u.id = ps."userId"
      WHERE ps."companyId" = ${companyId} AND ps."userId" = ${userId} AND ps."closedAt" IS NULL
      ORDER BY ps."openedAt" DESC
      LIMIT 1
    `.catch(() => [])
    return shifts[0] ?? null
  }

  async closeShift(companyId: string, userId: string, closingCash: number) {
    const shifts = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM "pos_shifts"
      WHERE "companyId" = ${companyId} AND "userId" = ${userId} AND "closedAt" IS NULL
      LIMIT 1
    `.catch(() => [])

    if (!shifts?.length) throw new NotFoundException('Ochiq smena topilmadi')
    const shiftId = shifts[0].id

    const report = await this.buildShiftReport(companyId, shiftId)

    await this.prisma.$executeRaw`
      UPDATE "pos_shifts"
      SET "closedAt" = NOW(), "closingCash" = ${closingCash},
          "totalSales" = ${report.totalSales}, "totalTransactions" = ${report.totalTransactions},
          "updatedAt" = NOW()
      WHERE id = ${shiftId}
    `.catch(() => null)

    return { ...report, shiftId }
  }

  async buildShiftReport(companyId: string, shiftId: string) {
    const salesRows = await this.prisma.$queryRaw<any[]>`
      SELECT
        i.id,
        i."totalAmount",
        i."createdAt",
        i."contactId",
        i."paymentMethod"
      FROM "invoices" i
      WHERE i."companyId" = ${companyId}
        AND i."shiftId" = ${shiftId}
        AND i.status != 'CANCELLED'
      ORDER BY i."createdAt" ASC
    `.catch(() => [])

    const totalSales        = salesRows.reduce((s: number, r: any) => s + Number(r.totalAmount), 0)
    const totalTransactions = salesRows.length

    const byPayment = await this.prisma.$queryRaw<any[]>`
      SELECT i."paymentMethod", SUM(i."totalAmount")::float AS total, COUNT(*)::int AS count
      FROM "invoices" i
      WHERE i."companyId" = ${companyId}
        AND i."shiftId" = ${shiftId}
        AND i.status != 'CANCELLED'
      GROUP BY i."paymentMethod"
    `.catch(() => [])

    const topProducts = await this.prisma.$queryRaw<any[]>`
      SELECT p.name, SUM(ii.quantity)::float AS qty, SUM(ii.quantity * ii."unitPrice")::float AS total
      FROM "invoice_items" ii
      JOIN "products" p ON p.id = ii."productId"
      JOIN "invoices" i ON i.id = ii."invoiceId"
      WHERE i."companyId" = ${companyId}
        AND i."shiftId" = ${shiftId}
        AND i.status != 'CANCELLED'
      GROUP BY p.name
      ORDER BY total DESC
      LIMIT 10
    `.catch(() => [])

    return {
      shiftId,
      totalSales,
      totalTransactions,
      byPayment,
      topProducts,
      transactions: salesRows,
    }
  }

  async getZReport(companyId: string, shiftId: string) {
    const shifts = await this.prisma.$queryRaw<any[]>`
      SELECT ps.*, u."firstName" || ' ' || u."lastName" AS "userName"
      FROM "pos_shifts" ps
      JOIN "users" u ON u.id = ps."userId"
      WHERE ps."companyId" = ${companyId} AND ps.id = ${shiftId}
    `.catch(() => [])

    if (!shifts?.length) throw new NotFoundException()
    const shift = shifts[0]
    const report = await this.buildShiftReport(companyId, shiftId)
    return { shift, ...report }
  }

  async getXReport(companyId: string, userId: string) {
    const shifts = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM "pos_shifts"
      WHERE "companyId" = ${companyId} AND "userId" = ${userId} AND "closedAt" IS NULL
      LIMIT 1
    `.catch(() => [])

    if (!shifts?.length) throw new NotFoundException('Ochiq smena topilmadi')
    return this.buildShiftReport(companyId, shifts[0].id)
  }

  async listShifts(companyId: string, limit = 20) {
    return this.prisma.$queryRaw<any[]>`
      SELECT ps.*, u."firstName" || ' ' || u."lastName" AS "userName"
      FROM "pos_shifts" ps
      JOIN "users" u ON u.id = ps."userId"
      WHERE ps."companyId" = ${companyId}
      ORDER BY ps."openedAt" DESC
      LIMIT ${limit}
    `.catch(() => [])
  }
}
