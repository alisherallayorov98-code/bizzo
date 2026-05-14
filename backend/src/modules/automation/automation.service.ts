import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateAutomationRuleDto, AutomationTrigger } from './dto/create-automation-rule.dto'
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto'
import { AutomationEngineService } from './automation-engine.service'

@Injectable()
export class AutomationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(companyId: string) {
    const rules = await this.prisma.automationRule.findMany({
      where:   { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } },
        logs:   { orderBy: { executedAt: 'desc' }, take: 1 },
      },
    })

    return rules.map(r => ({
      ...r,
      logCount: r._count.logs,
      lastLog:  r.logs[0] ?? null,
    }))
  }

  async findOne(id: string, companyId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where:   { id, companyId },
      include: {
        logs: {
          orderBy: { executedAt: 'desc' },
          take:    20,
        },
      },
    })
    if (!rule) throw new NotFoundException('Qoida topilmadi')
    return rule
  }

  async create(companyId: string, userId: string, dto: CreateAutomationRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        companyId,
        createdById: userId,
        name:        dto.name,
        description: dto.description,
        trigger:     dto.trigger as any,
        conditions:  (dto.conditions ?? []) as any,
        actions:     dto.actions as any,
        isActive:    dto.isActive ?? true,
        cooldownMin: dto.cooldownMin ?? 0,
      },
    })
  }

  async update(id: string, companyId: string, dto: UpdateAutomationRuleDto) {
    await this.ensureOwner(id, companyId)
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.trigger     !== undefined && { trigger:     dto.trigger as any }),
        ...(dto.conditions  !== undefined && { conditions:  dto.conditions as any }),
        ...(dto.actions     !== undefined && { actions:     dto.actions as any }),
        ...(dto.isActive    !== undefined && { isActive:    dto.isActive }),
        ...(dto.cooldownMin !== undefined && { cooldownMin: dto.cooldownMin }),
      },
    })
  }

  async remove(id: string, companyId: string) {
    await this.ensureOwner(id, companyId)
    await this.prisma.automationRule.delete({ where: { id } })
    return { success: true }
  }

  async toggleActive(id: string, companyId: string) {
    const rule = await this.ensureOwner(id, companyId)
    return this.prisma.automationRule.update({
      where: { id },
      data:  { isActive: !rule.isActive },
    })
  }

  // ─── Qo'lda ishga tushirish ────────────────────────────────────────────────

  async runManually(id: string, companyId: string) {
    await this.ensureOwner(id, companyId)
    await this.engine.fire({
      companyId,
      trigger:  AutomationTrigger.MANUAL,
      data:     { manual: true },
    })
    return { success: true, message: 'Qoida ishga tushirildi' }
  }

  // ─── Statistika ───────────────────────────────────────────────────────────

  async getStats(companyId: string) {
    const [total, active, totalRuns, recentLogs] = await Promise.all([
      this.prisma.automationRule.count({ where: { companyId } }),
      this.prisma.automationRule.count({ where: { companyId, isActive: true } }),
      this.prisma.automationLog.count({ where: { companyId } }),
      this.prisma.automationLog.findMany({
        where:   { companyId },
        orderBy: { executedAt: 'desc' },
        take:    10,
        include: { rule: { select: { name: true } } },
      }),
    ])

    return { total, active, totalRuns, recentLogs }
  }

  // ─── Trigger lar ro'yxati ─────────────────────────────────────────────────

  getTriggerList() {
    return [
      { value: AutomationTrigger.INVOICE_OVERDUE,    label: 'Hisob-faktura muddati o\'tdi',       icon: 'FileText',     category: 'finance' },
      { value: AutomationTrigger.DEBT_OVERDUE,       label: 'Qarz muddati o\'tdi',                icon: 'AlertCircle',  category: 'finance' },
      { value: AutomationTrigger.PAYMENT_RECEIVED,   label: 'To\'lov qabul qilindi',              icon: 'CreditCard',   category: 'finance' },
      { value: AutomationTrigger.STOCK_LOW,          label: 'Ombor zaxirasi tugayapti',           icon: 'Package',      category: 'warehouse' },
      { value: AutomationTrigger.STOCK_MOVEMENT,     label: 'Ombor harakati sodir bo\'ldi',       icon: 'Truck',        category: 'warehouse' },
      { value: AutomationTrigger.PURCHASE_RECEIVED,  label: 'Xarid buyurtmasi qabul qilindi',     icon: 'ShoppingCart', category: 'warehouse' },
      { value: AutomationTrigger.DEAL_WON,           label: 'Bitim yutildi',                      icon: 'TrendingUp',   category: 'sales' },
      { value: AutomationTrigger.DEAL_STAGE_CHANGED, label: 'Bitim bosqichi o\'zgardi',           icon: 'ArrowRight',   category: 'sales' },
      { value: AutomationTrigger.QUOTATION_APPROVED, label: 'Taklifnoma tasdiqlandi',             icon: 'FileCheck',    category: 'sales' },
      { value: AutomationTrigger.QUOTATION_EXPIRED,  label: 'Taklifnoma muddati o\'tdi',          icon: 'FileClock',    category: 'sales' },
      { value: AutomationTrigger.CONTRACT_EXPIRING,  label: 'Shartnoma tugayapti (30 kun)',       icon: 'Calendar',     category: 'sales' },
      { value: AutomationTrigger.CONTACT_CREATED,    label: 'Yangi kontragent qo\'shildi',        icon: 'UserPlus',     category: 'sales' },
      { value: AutomationTrigger.SALARY_DUE,         label: 'Ish haqi to\'lash vaqti keldi',      icon: 'DollarSign',   category: 'hr' },
      { value: AutomationTrigger.DAILY_MORNING,      label: 'Har kuni soat 09:00',                icon: 'Sun',          category: 'schedule' },
      { value: AutomationTrigger.WEEKLY_MONDAY,      label: 'Har dushanba 09:00',                 icon: 'CalendarDays', category: 'schedule' },
      { value: AutomationTrigger.MONTHLY_FIRST,      label: 'Har oyning 1-kuni 09:00',            icon: 'CalendarCheck',category: 'schedule' },
      { value: AutomationTrigger.MANUAL,             label: 'Qo\'lda ishga tushirish',            icon: 'Play',         category: 'other' },
    ]
  }

  getActionList() {
    return [
      { value: 'SEND_SMS',             label: 'SMS yuborish',               icon: 'MessageSquare' },
      { value: 'SEND_TELEGRAM',        label: 'Telegram xabar yuborish',    icon: 'Send' },
      { value: 'SEND_EMAIL',           label: 'Email yuborish',             icon: 'Mail' },
      { value: 'CREATE_NOTIFICATION',  label: 'Tizimda bildirishnoma',      icon: 'Bell' },
      { value: 'CREATE_TASK',          label: 'Vazifa yaratish',            icon: 'CheckSquare' },
      { value: 'WEBHOOK',              label: 'Webhook chaqirish',          icon: 'Zap' },
      { value: 'CREATE_INVOICE',       label: 'Invoice yaratish',           icon: 'FileText' },
      { value: 'UPDATE_DEAL_STAGE',    label: 'Bitim bosqichini o\'zgartirish', icon: 'ArrowRight' },
      { value: 'ASSIGN_USER',          label: 'Mas\'ul belgilash',          icon: 'UserCheck' },
      { value: 'DELAY',                label: 'Kutish (daqiqalarda)',        icon: 'Clock' },
    ]
  }

  // ─── Blueprintlar ─────────────────────────────────────────────────────────

  async onModuleInit() {
    await this.seedBlueprints()
  }

  async seedBlueprints() {
    const blueprints = [
      {
        key:         'invoice_overdue_sms',
        name:        'Muddati o\'tgan hisob-faktura — SMS',
        description: 'Hisob-faktura muddati o\'tganda mijozga avtomatik SMS yuboradi',
        category:    'finance',
        trigger:     'INVOICE_OVERDUE',
        conditions:  [{ field: 'daysOverdue', operator: 'gte', value: 1 }],
        actions:     [{ type: 'SEND_SMS', config: { template: 'Hurmatli {{contact.name}}, {{invoiceNumber}} raqamli hisob-fakturangiz {{daysOverdue}} kun muddati o\'tdi. Summa: {{amount}} UZS. Iltimos to\'lang.' } }],
        icon:        'MessageSquare',
        isPopular:   true,
      },
      {
        key:         'invoice_overdue_notify',
        name:        'Muddati o\'tgan hisob-faktura — Bildirishnoma',
        description: 'Muddati o\'tgan hisob-faktura haqida tizim xodimlarga xabar beradi',
        category:    'finance',
        trigger:     'INVOICE_OVERDUE',
        conditions:  [],
        actions:     [{ type: 'CREATE_NOTIFICATION', config: { title: 'Hisob-faktura muddati o\'tdi', message: '{{contact.name}} dan {{invoiceNumber}} — {{daysOverdue}} kun o\'tdi. Summa: {{amount}} UZS' } }],
        icon:        'Bell',
        isPopular:   false,
      },
      {
        key:         'debt_overdue_sms',
        name:        'Muddati o\'tgan qarz — SMS eslatma',
        description: 'Qarz muddati o\'tganda mijozga SMS yuboradi',
        category:    'finance',
        trigger:     'DEBT_OVERDUE',
        conditions:  [],
        actions:     [{ type: 'SEND_SMS', config: { template: 'Hurmatli {{contact.name}}, qarzingiz {{daysOverdue}} kun muddati o\'tdi. Qoldiq: {{remaining}} UZS.' } }],
        icon:        'AlertCircle',
        isPopular:   true,
      },
      {
        key:         'stock_low_telegram',
        name:        'Ombor zaxirasi kam — Telegram',
        description: 'Mahsulot miqdori minimal darajaga yetganda Telegram xabar yuboradi',
        category:    'warehouse',
        trigger:     'STOCK_LOW',
        conditions:  [],
        actions:     [{ type: 'SEND_TELEGRAM', config: { template: '⚠️ Ombor ogohlantirish!\n{{productName}} — {{warehouseName}} omborida {{currentStock}} ta qoldi (minimal: {{minStock}} ta)' } }],
        icon:        'Package',
        isPopular:   true,
      },
      {
        key:         'deal_won_task',
        name:        'Bitim yutildi — Vazifa yaratish',
        description: 'Bitim yutilganda onboarding vazifasi avtomatik yaratiladi',
        category:    'sales',
        trigger:     'DEAL_WON',
        conditions:  [],
        actions:     [{ type: 'CREATE_TASK', config: { title: '{{title}} — onboarding boshlash', description: 'Mijoz {{contact.name}} bilan onboarding jarayonini boshlang', priority: 'HIGH' } }],
        icon:        'CheckSquare',
        isPopular:   true,
      },
      {
        key:         'quotation_approved_invoice',
        name:        'Tasdiqlangan taklifnoma — Invoice yaratish',
        description: 'Taklifnoma tasdiqlanganda avtomatik invoice yaratiladi',
        category:    'sales',
        trigger:     'QUOTATION_APPROVED',
        conditions:  [],
        actions:     [{ type: 'CREATE_INVOICE', config: {} }],
        icon:        'FileText',
        isPopular:   true,
      },
      {
        key:         'daily_report_notify',
        name:        'Kunlik hisobot eslatmasi',
        description: 'Har kuni ertalab 09:00 da hisobotni tekshirish haqida eslatma',
        category:    'schedule',
        trigger:     'DAILY_MORNING',
        conditions:  [],
        actions:     [{ type: 'CREATE_NOTIFICATION', config: { title: 'Kunlik vazifalar', message: 'Bugungi hisobot va vazifalarni ko\'rib chiqishni unutmang!' } }],
        icon:        'Sun',
        isPopular:   false,
      },
      {
        key:         'salary_due_notify',
        name:        'Ish haqi vaqti eslatmasi',
        description: 'Har oyning 1-kunida ish haqi to\'lash vaqti kelganligi haqida xabar',
        category:    'hr',
        trigger:     'MONTHLY_FIRST',
        conditions:  [],
        actions:     [{ type: 'CREATE_NOTIFICATION', config: { title: 'Ish haqi vaqti', message: 'Bu oy ish haqi to\'lash muddatini tekshiring. Xodimlar ro\'yxatini ko\'rish uchun Xodimlar bo\'limiga o\'ting.' } }],
        icon:        'DollarSign',
        isPopular:   false,
      },
      {
        key:         'contract_expiring_notify',
        name:        'Shartnoma tugayapti — Bildirishnoma',
        description: '30 kun ichida tugaydigan shartnomalar haqida ogohlantirish',
        category:    'sales',
        trigger:     'CONTRACT_EXPIRING',
        conditions:  [{ field: 'daysLeft', operator: 'lte', value: 14 }],
        actions:     [{ type: 'CREATE_NOTIFICATION', config: { title: 'Shartnoma muddati tugayapti', message: '{{contact.name}} bilan "{{title}}" shartnomasi {{daysLeft}} kun ichida tugaydi' } }],
        icon:        'Calendar',
        isPopular:   false,
      },
    ]

    for (const bp of blueprints) {
      await this.prisma.automationBlueprint.upsert({
        where:  { key: bp.key },
        update: bp,
        create: bp as any,
      })
    }
  }

  async getBlueprints() {
    return this.prisma.automationBlueprint.findMany({ orderBy: [{ isPopular: 'desc' }, { category: 'asc' }] })
  }

  async installBlueprint(key: string, companyId: string, userId: string) {
    const bp = await this.prisma.automationBlueprint.findUnique({ where: { key } })
    if (!bp) throw new NotFoundException('Blueprint topilmadi')

    return this.prisma.automationRule.create({
      data: {
        companyId,
        createdById: userId,
        name:        bp.name,
        description: bp.description,
        trigger:     bp.trigger as any,
        conditions:  bp.conditions as any,
        actions:     bp.actions as any,
        isActive:    true,
        cooldownMin: 0,
      },
    })
  }

  // ─── Log endpoints ────────────────────────────────────────────────────────

  async getLogs(companyId: string, query: {
    ruleId?:  string
    status?:  string
    trigger?: string
    from?:    string
    to?:      string
    page?:    number
    limit?:   number
  }) {
    const page  = Number(query.page  ?? 1)
    const limit = Number(query.limit ?? 20)

    const where: any = { companyId }
    if (query.ruleId)  where.ruleId  = query.ruleId
    if (query.status)  where.status  = query.status
    if (query.trigger) where.trigger = query.trigger
    if (query.from || query.to) {
      where.executedAt = {}
      if (query.from) where.executedAt.gte = new Date(query.from)
      if (query.to)   where.executedAt.lte = new Date(query.to)
    }

    const [logs, total] = await Promise.all([
      this.prisma.automationLog.findMany({
        where,
        orderBy: { executedAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { rule: { select: { name: true } } },
      }),
      this.prisma.automationLog.count({ where }),
    ])

    return { logs, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async retryLog(logId: string, companyId: string) {
    await this.engine.retryLog(logId, companyId)
    return { success: true, message: 'Qayta ishga tushirildi' }
  }

  // ─── Yordamchi ────────────────────────────────────────────────────────────

  private async ensureOwner(id: string, companyId: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, companyId } })
    if (!rule) throw new NotFoundException('Qoida topilmadi')
    return rule
  }
}
