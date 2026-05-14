import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../integrations/sms/sms.service'
import { TelegramService } from '../integrations/telegram/telegram.service'
import { NotificationsService } from '../notifications/notifications.service'
import { AutomationTrigger, ActionType } from './dto/create-automation-rule.dto'

export interface TriggerContext {
  companyId:  string
  trigger:    AutomationTrigger
  entityId?:  string
  entityType?: string
  data:       Record<string, any>
}

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name)

  constructor(
    private readonly prisma:        PrismaService,
    private readonly sms:           SmsService,
    private readonly telegram:      TelegramService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Tashqi chaqiruv ─────────────────────────────────────────────────────

  async fire(ctx: TriggerContext): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { companyId: ctx.companyId, trigger: ctx.trigger as any, isActive: true },
    })
    for (const rule of rules) {
      await this.executeRule(rule, ctx)
    }
  }

  // ─── Cron: har 30 daqiqada hodisaga bog'liq triggerlar ───────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduledTriggers(): Promise<void> {
    await Promise.all([
      this.checkInvoiceOverdue(),
      this.checkStockLow(),
      this.checkContractExpiring(),
      this.checkDebtOverdue(),
      this.checkSalaryDue(),
      this.checkExpiredQuotations(),
    ])
  }

  // ─── Cron: vaqtga bog'liq triggerlar ────────────────────────────────────

  @Cron('0 9 * * *')
  async runDailyMorning(): Promise<void> {
    const companies = await this.prisma.company.findMany({ select: { id: true } })
    await Promise.all(
      companies.map(c => this.fire({
        companyId: c.id,
        trigger:   AutomationTrigger.DAILY_MORNING,
        data:      { date: new Date().toISOString().slice(0, 10) },
      })),
    )
  }

  @Cron('0 9 * * 1')
  async runWeeklyMonday(): Promise<void> {
    const companies = await this.prisma.company.findMany({ select: { id: true } })
    await Promise.all(
      companies.map(c => this.fire({
        companyId: c.id,
        trigger:   AutomationTrigger.WEEKLY_MONDAY,
        data:      { date: new Date().toISOString().slice(0, 10), weekday: 'Monday' },
      })),
    )
  }

  @Cron('0 9 1 * *')
  async runMonthlyFirst(): Promise<void> {
    const companies = await this.prisma.company.findMany({ select: { id: true } })
    await Promise.all(
      companies.map(c => this.fire({
        companyId: c.id,
        trigger:   AutomationTrigger.MONTHLY_FIRST,
        data:      { date: new Date().toISOString().slice(0, 10), month: new Date().getMonth() + 1 },
      })),
    )
  }

  // ─── Scheduled checker: Invoice overdue ──────────────────────────────────

  private async checkInvoiceOverdue(): Promise<void> {
    const now = new Date()
    const overdue = await this.prisma.invoice.findMany({
      where:   { dueDate: { lt: now }, status: { notIn: ['PAID', 'CANCELLED'] as any } },
      include: { contact: true },
      take: 200,
    })
    for (const inv of overdue) {
      const daysOverdue = Math.floor((now.getTime() - inv.dueDate!.getTime()) / 86400000)
      await this.fire({
        companyId:  inv.companyId,
        trigger:    AutomationTrigger.INVOICE_OVERDUE,
        entityId:   inv.id,
        entityType: 'Invoice',
        data: {
          invoiceNumber: inv.invoiceNumber,
          amount:        Number((inv as any).totalAmount ?? 0),
          daysOverdue,
          contact: { name: inv.contact?.name, phone: inv.contact?.phone, email: inv.contact?.email },
        },
      })
    }
  }

  // ─── Stock low ───────────────────────────────────────────────────────────

  private async checkStockLow(): Promise<void> {
    const lowStock = await this.prisma.$queryRaw<any[]>`
      SELECT si.*, p.name as product_name, p."minStock", p."companyId",
             w.name as warehouse_name, si.id as item_id
      FROM stock_items si
      JOIN products p ON p.id = si."productId"
      JOIN warehouses w ON w.id = si."warehouseId"
      WHERE p."minStock" > 0 AND si.quantity <= p."minStock"
      LIMIT 200
    `
    for (const item of lowStock) {
      await this.fire({
        companyId:  item.companyId,
        trigger:    AutomationTrigger.STOCK_LOW,
        entityId:   item.item_id,
        entityType: 'StockItem',
        data: {
          productName:   item.product_name,
          currentStock:  Number(item.quantity),
          minStock:      Number(item.minStock),
          warehouseName: item.warehouse_name,
        },
      })
    }
  }

  // ─── Contract expiring ───────────────────────────────────────────────────

  private async checkContractExpiring(): Promise<void> {
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    const contracts = await this.prisma.contract.findMany({
      where:   { endDate: { lte: soon, gte: new Date() }, status: { notIn: ['EXPIRED', 'TERMINATED'] as any } },
      include: { contact: true },
      take: 200,
    })
    for (const c of contracts) {
      const daysLeft = Math.floor((c.endDate!.getTime() - Date.now()) / 86400000)
      await this.fire({
        companyId:  c.companyId,
        trigger:    AutomationTrigger.CONTRACT_EXPIRING,
        entityId:   c.id,
        entityType: 'Contract',
        data: {
          contractNumber: c.contractNumber,
          title:          c.title,
          daysLeft,
          contact: { name: c.contact?.name, phone: c.contact?.phone, email: c.contact?.email },
        },
      })
    }
  }

  // ─── Debt overdue ────────────────────────────────────────────────────────

  private async checkDebtOverdue(): Promise<void> {
    const now = new Date()
    const debts = await this.prisma.debtRecord.findMany({
      where:   { dueDate: { lt: now }, isPaid: false, remaining: { gt: 0 } },
      include: { contact: true },
      take: 200,
    })
    for (const debt of debts) {
      const daysOverdue = Math.floor((now.getTime() - debt.dueDate!.getTime()) / 86400000)
      await this.fire({
        companyId:  debt.companyId,
        trigger:    AutomationTrigger.DEBT_OVERDUE,
        entityId:   debt.id,
        entityType: 'DebtRecord',
        data: {
          amount:      Number(debt.amount),
          remaining:   Number(debt.remaining),
          daysOverdue,
          contact: { name: debt.contact?.name, phone: debt.contact?.phone, email: debt.contact?.email },
        },
      })
    }
  }

  // ─── Salary due ──────────────────────────────────────────────────────────

  private async checkSalaryDue(): Promise<void> {
    const in3days = new Date()
    in3days.setDate(in3days.getDate() + 3)
    const employees = await this.prisma.employee.findMany({
      where: { salaryDueDate: { lte: in3days, gte: new Date() }, isActive: true } as any,
      take: 200,
    }).catch(() => [])

    for (const emp of employees) {
      const daysLeft = Math.floor(((emp as any).salaryDueDate!.getTime() - Date.now()) / 86400000)
      await this.fire({
        companyId:  (emp as any).companyId,
        trigger:    AutomationTrigger.SALARY_DUE,
        entityId:   emp.id,
        entityType: 'Employee',
        data: {
          employeeName: `${(emp as any).firstName ?? ''} ${(emp as any).lastName ?? ''}`.trim(),
          daysLeft,
        },
      })
    }
  }

  // ─── Expired quotations ──────────────────────────────────────────────────

  private async checkExpiredQuotations(): Promise<void> {
    const now = new Date()
    const expired = await this.prisma.$queryRaw<any[]>`
      UPDATE quotations
      SET status = 'EXPIRED', "updatedAt" = NOW()
      WHERE "validUntil" < ${now}
        AND status = 'SENT'
      RETURNING id, "companyId", "quoteNumber", "totalAmount", "contactId"
    `.catch(() => [])

    for (const q of expired) {
      const contact = q.contactId
        ? await this.prisma.contact.findUnique({ where: { id: q.contactId }, select: { name: true, phone: true, email: true } }).catch(() => null)
        : null
      await this.fire({
        companyId:  q.companyId,
        trigger:    AutomationTrigger.QUOTATION_EXPIRED,
        entityId:   q.id,
        entityType: 'Quotation',
        data: {
          quoteNumber:  q.quoteNumber,
          totalAmount:  Number(q.totalAmount ?? 0),
          contact:      contact ?? {},
        },
      })
    }
  }

  // ─── Retry log ───────────────────────────────────────────────────────────

  async retryLog(logId: string, companyId: string): Promise<void> {
    const log = await this.prisma.automationLog.findFirst({ where: { id: logId, companyId } })
    if (!log) return

    const rule = await this.prisma.automationRule.findFirst({ where: { id: log.ruleId, companyId } })
    if (!rule) return

    const ctx: TriggerContext = log.contextData
      ? (log.contextData as any)
      : { companyId, trigger: log.trigger as AutomationTrigger, entityId: log.entityId ?? undefined, entityType: log.entityType ?? undefined, data: {} }

    await this.executeRule(rule, ctx)
  }

  // ─── Qoidani bajarish ─────────────────────────────────────────────────────

  async executeRule(rule: any, ctx: TriggerContext): Promise<void> {
    if (rule.cooldownMin > 0 && rule.lastRunAt) {
      const diffMin = (Date.now() - rule.lastRunAt.getTime()) / 60000
      if (diffMin < rule.cooldownMin) return
    }

    const conditions = rule.conditions as Array<{ field: string; operator: string; value: any }>
    if (!this.checkConditions(conditions, ctx.data)) return

    const actions = rule.actions as Array<{ type: ActionType; config: Record<string, any> }>
    const actionsRun: any[] = []
    let hasError = false

    for (const action of actions) {
      try {
        await this.executeAction(action, ctx)
        actionsRun.push({ type: action.type, status: 'ok' })
      } catch (err: any) {
        hasError = true
        actionsRun.push({ type: action.type, status: 'error', error: err.message })
        this.logger.error(`Automation action ${action.type} failed: ${err.message}`)
      }
    }

    await this.prisma.automationLog.create({
      data: {
        ruleId:      rule.id,
        companyId:   ctx.companyId,
        status:      hasError ? (actionsRun.some(a => a.status === 'ok') ? 'PARTIAL' : 'FAILED') : 'SUCCESS',
        trigger:     ctx.trigger,
        entityId:    ctx.entityId,
        entityType:  ctx.entityType,
        actionsRun:  actionsRun as any,
        contextData: ctx as any,
      },
    })

    await this.prisma.automationRule.update({
      where: { id: rule.id },
      data:  { runCount: { increment: 1 }, lastRunAt: new Date() },
    })
  }

  // ─── Shartlarni tekshirish ────────────────────────────────────────────────

  private checkConditions(
    conditions: Array<{ field: string; operator: string; value: any }>,
    data: Record<string, any>,
  ): boolean {
    if (!conditions || conditions.length === 0) return true
    return conditions.every(cond => {
      const actual   = this.getNestedValue(data, cond.field)
      const expected = cond.value
      switch (cond.operator) {
        case 'gt':       return Number(actual) > Number(expected)
        case 'gte':      return Number(actual) >= Number(expected)
        case 'lt':       return Number(actual) < Number(expected)
        case 'lte':      return Number(actual) <= Number(expected)
        case 'eq':       return String(actual) === String(expected)
        case 'neq':      return String(actual) !== String(expected)
        case 'contains': return String(actual ?? '').includes(String(expected))
        case 'in':       return Array.isArray(expected) && expected.includes(actual)
        default:         return true
      }
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj)
  }

  // ─── Harakatni bajarish ───────────────────────────────────────────────────

  private async executeAction(
    action: { type: ActionType; config: Record<string, any> },
    ctx:    TriggerContext,
  ): Promise<void> {
    const cfg  = action.config
    const data = ctx.data

    switch (action.type) {

      case ActionType.SEND_SMS: {
        const phone = this.interpolate(cfg.phone ?? data?.contact?.phone ?? '', data)
        const text  = this.interpolate(cfg.template ?? '', data)
        if (phone) await this.sms.send(ctx.companyId, phone, text)
        break
      }

      case ActionType.SEND_TELEGRAM: {
        const chatId = this.interpolate(cfg.chatId ?? '', data)
        const msg    = this.interpolate(cfg.template ?? '', data)
        if (chatId) await this.telegram.sendMessage(ctx.companyId, chatId, msg)
        break
      }

      case ActionType.SEND_EMAIL: {
        const to      = this.interpolate(cfg.to ?? data?.contact?.email ?? '', data)
        const subject = this.interpolate(cfg.subject ?? '', data)
        const body    = this.interpolate(cfg.body ?? '', data)
        if (to) {
          await this.prisma.emailLog.create({
            data: { companyId: ctx.companyId, to, subject, template: 'automation', metadata: { body } as any },
          })
        }
        break
      }

      case ActionType.CREATE_NOTIFICATION: {
        const users = await this.prisma.user.findMany({
          where:  { companyId: ctx.companyId, isActive: true },
          select: { id: true },
        })
        const title   = this.interpolate(cfg.title   ?? 'Avtomatik bildirishnoma', data)
        const message = this.interpolate(cfg.message ?? '', data)
        for (const user of users) {
          await this.prisma.notification.create({
            data: { companyId: ctx.companyId, userId: user.id, title, message, type: 'AUTOMATION' },
          })
        }
        break
      }

      case ActionType.CREATE_TASK: {
        const title       = this.interpolate(cfg.title       ?? 'Avtomatik vazifa', data)
        const description = this.interpolate(cfg.description ?? '', data)
        await this.prisma.serviceTicket.create({
          data: {
            companyId:   ctx.companyId,
            title,
            description,
            status:      'OPEN',
            priority:    cfg.priority ?? 'MEDIUM',
            contactId:   ctx.entityType === 'Contact' ? ctx.entityId : undefined,
          },
        })
        break
      }

      case ActionType.WEBHOOK: {
        if (cfg.url) {
          await this.prisma.webhookEvent.create({
            data: {
              companyId: ctx.companyId,
              eventType: ctx.trigger,
              payload:   { ...ctx.data, ruleConfig: cfg } as any,
              status:    'PENDING',
            },
          })
        }
        break
      }

      case ActionType.CREATE_INVOICE: {
        if (ctx.entityType === 'Quotation' && ctx.entityId) {
          const q = await this.prisma.quotation.findUnique({
            where:   { id: ctx.entityId },
            include: { items: true },
          })
          if (q && (q.status === 'APPROVED' || q.status === 'SENT')) {
            const lastInv = await this.prisma.invoice.findFirst({
              where:   { companyId: ctx.companyId },
              orderBy: { createdAt: 'desc' },
              select:  { invoiceNumber: true },
            })
            const nextNum = lastInv
              ? `INV-${String(Number(lastInv.invoiceNumber.replace(/\D/g, '')) + 1).padStart(4, '0')}`
              : 'INV-0001'
            await this.prisma.$transaction(async tx => {
              const inv = await tx.invoice.create({
                data: {
                  companyId:     ctx.companyId,
                  invoiceNumber: nextNum,
                  contactId:     q.contactId,
                  status:        'DRAFT' as any,
                  dueDate:       new Date(Date.now() + 14 * 86400000),
                  subtotal:      q.subtotal,
                  discount:      q.discount,
                  taxRate:       q.taxRate,
                  totalAmount:   q.totalAmount,
                  notes:         q.notes,
                  items: {
                    create: q.items.map(it => ({
                      name:       it.name,
                      quantity:   it.quantity,
                      price:      it.unitPrice,
                      totalPrice: it.totalPrice,
                    })),
                  },
                },
              })
              await tx.quotation.update({ where: { id: ctx.entityId }, data: { status: 'CONVERTED', convertedInvoiceId: inv.id } })
            })
          }
        }
        break
      }

      case ActionType.DELAY: {
        const ms = Math.min(cfg.delayMinutes ?? 0, 5) * 60 * 1000
        if (ms > 0) await new Promise(r => setTimeout(r, ms))
        break
      }

      case ActionType.UPDATE_DEAL_STAGE: {
        if (ctx.entityType === 'Deal' && ctx.entityId && cfg.stage) {
          await this.prisma.deal.update({
            where: { id: ctx.entityId },
            data:  { stage: cfg.stage },
          })
        }
        break
      }

      case ActionType.ASSIGN_USER: {
        if (ctx.entityId && cfg.userId) {
          if (ctx.entityType === 'Deal') {
            await this.prisma.deal.update({ where: { id: ctx.entityId }, data: { assignedToId: cfg.userId } }).catch(() => null)
          } else if (ctx.entityType === 'ServiceTicket') {
            await this.prisma.serviceTicket.update({ where: { id: ctx.entityId }, data: { assignedToId: cfg.userId } as any }).catch(() => null)
          }
        }
        break
      }

      default:
        this.logger.warn(`Noma'lum action turi: ${action.type}`)
    }
  }

  // ─── Shablon interpolatsiya ───────────────────────────────────────────────

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const val = this.getNestedValue(data, path.trim())
      return val !== undefined ? String(val) : ''
    })
  }
}
