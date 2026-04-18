import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type AuditAction =
  | 'CREATE'           | 'UPDATE'          | 'DELETE'
  | 'LOGIN_SUCCESS'    | 'LOGIN_FAILED'     | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'EXPORT'           | 'IMPORT'
  | 'MODULE_ACTIVATE'  | 'MODULE_DEACTIVATE'
  | 'USER_CREATE'      | 'USER_BLOCK'       | 'USER_UNBLOCK'
  | 'CONTACT_NOTE'
  | 'DEAL_STAGE_CHANGE' | 'INVOICE_PAID'
  | 'DEBT_PAYMENT'
  | 'STOCK_MOVEMENT'
  | 'SALARY_PAID'
  | 'SMS_SENT'         | 'TELEGRAM_SENT'

export interface CreateAuditLogDto {
  companyId:  string
  userId?:    string
  action:     AuditAction
  entity:     string
  entityId?:  string
  oldData?:   Record<string, any>
  newData?:   Record<string, any>
  ipAddress?: string
  userAgent?: string
}

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE:              'Yaratildi',
  UPDATE:              'Yangilandi',
  DELETE:              "O'chirildi",
  LOGIN_SUCCESS:       'Tizimga kirdi',
  LOGIN_FAILED:        'Kirishda xatolik',
  LOGOUT:              'Tizimdan chiqdi',
  PASSWORD_CHANGE:     "Parol o'zgardi",
  EXPORT:              'Eksport qilindi',
  IMPORT:              'Import qilindi',
  MODULE_ACTIVATE:     'Modul ulandi',
  MODULE_DEACTIVATE:   "Modul o'chirildi",
  USER_CREATE:         "Foydalanuvchi qo'shildi",
  USER_BLOCK:          'Foydalanuvchi bloklandi',
  USER_UNBLOCK:        'Blok olib tashlandi',
  CONTACT_NOTE:        "Izoh qo'shildi",
  DEAL_STAGE_CHANGE:   "Deal bosqichi o'zgardi",
  INVOICE_PAID:        "Invoice to'landi",
  DEBT_PAYMENT:        "Qarz to'lovi",
  STOCK_MOVEMENT:      'Ombor harakati',
  SALARY_PAID:         "Ish haqi to'landi",
  SMS_SENT:            'SMS yuborildi',
  TELEGRAM_SENT:       'Telegram xabari',
}

const SENSITIVE_FIELDS = ['passwordHash', 'password', 'token', 'refreshToken', 'apiKey']

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: dto.companyId,
          userId:    dto.userId,
          action:    dto.action,
          entity:    dto.entity,
          entityId:  dto.entityId,
          oldData:   dto.oldData as any,
          newData:   dto.newData as any,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      })
    } catch (error) {
      console.error('Audit log yozishda xatolik:', error)
    }
  }

  static diff(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): { changed: string[]; old: Record<string, any>; new: Record<string, any> } {
    const changed: string[]            = []
    const oldDiff: Record<string, any> = {}
    const newDiff: Record<string, any> = {}

    for (const key of Object.keys({ ...oldData, ...newData })) {
      if (SENSITIVE_FIELDS.includes(key)) continue
      const oldVal = oldData[key]
      const newVal = newData[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(key)
        oldDiff[key] = oldVal
        newDiff[key] = newVal
      }
    }

    return { changed, old: oldDiff, new: newDiff }
  }

  async getLogs(
    companyId: string,
    filters: {
      userId?:   string
      entity?:   string
      action?:   string
      dateFrom?: string
      dateTo?:   string
      page?:     number
      limit?:    number
    },
  ) {
    const { userId, entity, action, dateFrom, dateTo, page = 1, limit = 50 } = filters

    const where: any = {
      companyId,
      ...(userId && { userId }),
      ...(entity && { entity: { contains: entity, mode: 'insensitive' } }),
      ...(action && { action }),
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(`${dateTo}T23:59:59`) }),
      }
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ])

    return {
      data: logs.map(log => ({
        ...log,
        actionLabel: ACTION_LABELS[log.action as AuditAction] || log.action,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async getUserActivity(companyId: string, days = 30) {
    const from = new Date()
    from.setDate(from.getDate() - days)

    const logs = await this.prisma.auditLog.groupBy({
      by:      ['userId', 'action'],
      where:   { companyId, createdAt: { gte: from } },
      _count:  true,
      orderBy: { _count: { action: 'desc' } },
    })

    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[]
    const users   = await this.prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    })

    return logs.map(log => ({
      ...log,
      user:        users.find(u => u.id === log.userId),
      actionLabel: ACTION_LABELS[log.action as AuditAction] || log.action,
    }))
  }

  async detectSuspiciousActivity(companyId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const suspicious: any[] = []

    // Ko'p marta muvaffaqiyatsiz login urinish
    const failedLogins = await this.prisma.auditLog.groupBy({
      by:     ['ipAddress'],
      where:  { companyId, action: 'LOGIN_FAILED', createdAt: { gte: oneHourAgo } },
      _count: true,
      having: { action: { _count: { gt: 3 } } },
    })

    if (failedLogins.length > 0) {
      suspicious.push({
        type:    'BRUTE_FORCE',
        message: `${failedLogins.length} ta IP manzildan ko'p login urinish`,
        ips:     failedLogins.map(f => f.ipAddress),
      })
    }

    // Ko'p eksport
    const exports = await this.prisma.auditLog.groupBy({
      by:     ['userId'],
      where:  { companyId, action: 'EXPORT', createdAt: { gte: oneHourAgo } },
      _count: true,
      having: { action: { _count: { gt: 5 } } },
    })

    if (exports.length > 0) {
      suspicious.push({
        type:    'MASS_EXPORT',
        message: `Bir soatda ${exports.length} ta foydalanuvchi ko'p eksport qildi`,
        users:   exports.map(e => e.userId),
      })
    }

    // Ko'p o'chirish
    const deletions = await this.prisma.auditLog.count({
      where: { companyId, action: 'DELETE', createdAt: { gte: oneHourAgo } },
    })

    if (deletions > 20) {
      suspicious.push({
        type:    'MASS_DELETE',
        message: `Bir soatda ${deletions} ta yozuv o'chirildi`,
      })
    }

    return suspicious
  }
}
