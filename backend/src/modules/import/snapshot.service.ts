import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SnapshotService {
  constructor(private prisma: PrismaService) {}

  async takeSnapshot(companyId: string): Promise<string> {
    const [contacts, products, debts, employees, stockItems] = await Promise.all([
      this.prisma.contact.count({ where: { companyId } }),
      this.prisma.product.count({ where: { companyId } }),
      this.prisma.debtRecord.count({ where: { companyId } }),
      this.prisma.employee.count({ where: { companyId } }),
      this.prisma.stockItem.count({ where: { warehouse: { companyId } } }),
    ])

    const snapshot = await this.prisma.migrationSnapshot.create({
      data: {
        companyId,
        summary: { contacts, products, debts, employees, stockItems },
      },
    })

    return snapshot.id
  }

  async getSnapshot(snapshotId: string) {
    return this.prisma.migrationSnapshot.findUnique({
      where: { id: snapshotId },
    })
  }

  // Rollback: import qilingan ma'lumotlarni o'chirish (faqat shu kompaniya ma'lumotlari)
  async rollback(sessionId: string, companyId: string): Promise<{ deleted: number }> {
    // Session faqat shu companyId ga tegishli ekanini tekshirish
    const session = await this.prisma.migrationSession.findFirst({
      where: { id: sessionId, companyId },
    })
    if (!session) return { deleted: 0 }

    const logs = await this.prisma.migrationLog.findMany({
      where: { sessionId, action: 'created' },
      select: { entity: true, internalId: true },
    })

    let deleted = 0

    for (const log of logs) {
      if (!log.internalId) continue
      try {
        if (log.entity === 'contact') {
          const r = await this.prisma.contact.deleteMany({ where: { id: log.internalId, companyId } })
          deleted += r.count
        } else if (log.entity === 'product') {
          const r = await this.prisma.product.deleteMany({ where: { id: log.internalId, companyId } })
          deleted += r.count
        } else if (log.entity === 'debt') {
          const r = await this.prisma.debtRecord.deleteMany({ where: { id: log.internalId, companyId } })
          deleted += r.count
        } else if (log.entity === 'employee') {
          const r = await this.prisma.employee.deleteMany({ where: { id: log.internalId, companyId } })
          deleted += r.count
        }
      } catch {}
    }

    await this.prisma.migrationSession.update({
      where: { id: sessionId },
      data:  { status: 'ROLLED_BACK' },
    })

    return { deleted }
  }
}
