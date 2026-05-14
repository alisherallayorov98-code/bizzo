import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { automationService } from '@services/automation.service'
import type {
  AutomationRule, AutomationTrigger, ActionType,
  AutomationCondition, AutomationAction,
} from '@/types/automation'
import toast from 'react-hot-toast'
import {
  X, Plus, Trash2, ChevronDown, Zap, Settings2,
  Play, Save, Info,
} from 'lucide-react'

// ─── Shabl onlar ──────────────────────────────────────────────────────────────

const ACTION_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; required?: boolean }>> = {
  SEND_SMS: [
    { key: 'phone',    label: 'Telefon',           placeholder: '{{contact.phone}} yoki +998901234567' },
    { key: 'template', label: 'SMS matni',          placeholder: 'Hurmatli {{contact.name}}, ...', required: true },
  ],
  SEND_TELEGRAM: [
    { key: 'chatId',   label: 'Chat ID',            placeholder: '-1001234567890' },
    { key: 'template', label: 'Xabar matni',        placeholder: 'Hurmatli {{contact.name}}, ...', required: true },
  ],
  SEND_EMAIL: [
    { key: 'to',       label: 'Email manzil',       placeholder: '{{contact.email}}' },
    { key: 'subject',  label: 'Mavzu',              placeholder: 'Muhim: ...', required: true },
    { key: 'body',     label: 'Xabar matni',        placeholder: 'Hurmatli {{contact.name}}, ...' },
  ],
  CREATE_NOTIFICATION: [
    { key: 'title',   label: 'Sarlavha',            placeholder: 'Diqqat!', required: true },
    { key: 'message', label: 'Xabar',               placeholder: '{{contact.name}} uchun amal qiling...' },
  ],
  CREATE_TASK: [
    { key: 'title',       label: 'Vazifa nomi',     placeholder: 'Mijozga qo\'ng\'iroq qiling', required: true },
    { key: 'description', label: 'Tavsif',          placeholder: '{{contact.name}} bilan bog\'laning...' },
    { key: 'priority',    label: 'Muhimlik',        placeholder: 'MEDIUM' },
  ],
  WEBHOOK: [
    { key: 'url',    label: 'Webhook URL',          placeholder: 'https://...', required: true },
    { key: 'method', label: 'Metod (GET/POST)',     placeholder: 'POST' },
  ],
  CREATE_INVOICE: [],
  DELAY: [
    { key: 'delayMinutes', label: 'Kutish (daqiqa, max 5)', placeholder: '5', required: true },
  ],
  UPDATE_DEAL_STAGE: [
    { key: 'stage', label: 'Yangi bosqich', placeholder: 'WON / LOST / NEGOTIATION / PROPOSAL', required: true },
  ],
  ASSIGN_USER: [
    { key: 'userId', label: 'Foydalanuvchi ID', placeholder: 'user_id', required: true },
  ],
}

const CONDITION_FIELDS: Record<string, Array<{ value: string; label: string }>> = {
  INVOICE_OVERDUE:    [
    { value: 'daysOverdue', label: 'Kechikish kunlari' },
    { value: 'amount',      label: 'Summa' },
  ],
  STOCK_LOW:          [
    { value: 'currentStock', label: 'Joriy zaxira' },
    { value: 'minStock',     label: 'Minimal zaxira' },
  ],
  DEBT_OVERDUE:       [
    { value: 'daysOverdue', label: 'Kechikish kunlari' },
    { value: 'remaining',   label: 'Qolgan summa' },
  ],
  CONTRACT_EXPIRING:  [
    { value: 'daysLeft', label: 'Qolgan kunlar' },
  ],
  DEAL_WON:           [
    { value: 'finalAmount', label: 'Bitim summasi' },
  ],
  PAYMENT_RECEIVED:   [
    { value: 'amount', label: "To'lov summasi" },
  ],
  QUOTATION_APPROVED: [
    { value: 'totalAmount', label: 'Taklifnoma summasi' },
  ],
  QUOTATION_EXPIRED:  [
    { value: 'totalAmount', label: 'Taklifnoma summasi' },
  ],
  PURCHASE_RECEIVED:  [],
  DEAL_STAGE_CHANGED: [],
  DEAL_STALE:         [{ value: 'daysSinceUpdate', label: 'Harakatsiz kunlar' }],
  CONTACT_CREATED:    [],
  CUSTOMER_INACTIVE:  [{ value: 'daysSincePurchase', label: 'Xarid qilmagan kunlar' }],
  SALARY_DUE:         [],
  STOCK_MOVEMENT:     [],
  MANUAL:             [],
  DAILY_MORNING:      [],
  WEEKLY_MONDAY:      [],
  MONTHLY_FIRST:      [],
  WEBHOOK_INBOUND:    [],
  INVOICE_DUE_SOON:   [{ value: 'daysLeft', label: 'Muddatgacha kunlar' }],
}

const TRIGGER_VARS: Record<string, string[]> = {
  INVOICE_OVERDUE:    ['contact.name', 'contact.phone', 'contact.email', 'invoiceNumber', 'amount', 'daysOverdue'],
  DEBT_OVERDUE:       ['contact.name', 'contact.phone', 'amount', 'remaining', 'daysOverdue'],
  CONTRACT_EXPIRING:  ['contact.name', 'contractNumber', 'title', 'daysLeft'],
  STOCK_LOW:          ['productName', 'currentStock', 'minStock', 'warehouseName'],
  DEAL_WON:           ['title', 'contact.name', 'finalAmount'],
  DEAL_STAGE_CHANGED: ['title', 'contact.name', 'stage'],
  QUOTATION_APPROVED: ['quoteNumber', 'contact.name', 'totalAmount'],
  QUOTATION_EXPIRED:  ['quoteNumber', 'contact.name', 'totalAmount'],
  PURCHASE_RECEIVED:  ['orderNumber', 'supplier.name', 'totalAmount', 'status'],
  CONTACT_CREATED:    ['contact.name', 'contact.phone', 'contact.email'],
  SALARY_DUE:         ['employeeName', 'daysLeft'],
  DAILY_MORNING:      ['date'],
  WEEKLY_MONDAY:      ['date', 'weekday'],
  MONTHLY_FIRST:      ['date', 'month'],
  MANUAL:             [],
  INVOICE_DUE_SOON:   ['contact.name', 'contact.phone', 'contact.email', 'invoiceNumber', 'amount', 'daysLeft'],
  DEAL_STALE:         ['title', 'stage', 'amount', 'daysSinceUpdate', 'contact.name'],
  CUSTOMER_INACTIVE:  ['contact.name', 'contact.phone', 'contact.email', 'daysSincePurchase'],
  WEBHOOK_INBOUND:    ['webhookName', 'slug', 'payload'],
}

const OPERATORS = [
  { value: 'gte', label: '>= (katta yoki teng)' },
  { value: 'gt',  label: '> (katta)' },
  { value: 'lte', label: '<= (kichik yoki teng)' },
  { value: 'lt',  label: '< (kichik)' },
  { value: 'eq',  label: '= (teng)' },
  { value: 'neq', label: '≠ (teng emas)' },
]

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  rule:    AutomationRule | null
  onClose: () => void
}

export function AutomationRuleModal({ rule, onClose }: Props) {
  const isEdit = Boolean(rule)

  const [name,        setName]        = useState(rule?.name        ?? '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [trigger,     setTrigger]     = useState<AutomationTrigger>(rule?.trigger ?? 'INVOICE_OVERDUE')
  const [conditions,  setConditions]  = useState<AutomationCondition[]>(rule?.conditions ?? [])
  const [actions,     setActions]     = useState<AutomationAction[]>(
    rule?.actions ?? [{ type: 'CREATE_NOTIFICATION', config: { title: '', message: '' } }]
  )
  const [isActive,    setIsActive]    = useState(rule?.isActive ?? true)
  const [cooldownMin, setCooldownMin] = useState(String(rule?.cooldownMin ?? '0'))
  const [nameError,   setNameError]   = useState('')

  const { data: triggers = [] } = useQuery({
    queryKey: ['automation-triggers'],
    queryFn:  automationService.getTriggers,
  })

  const { data: actionMetas = [] } = useQuery({
    queryKey: ['automation-actions'],
    queryFn:  automationService.getActions,
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name, description, trigger, conditions, actions,
        isActive, cooldownMin: Number(cooldownMin),
      }
      if (isEdit && rule) return automationService.update(rule.id, payload)
      return automationService.create(payload as any)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Qoida yangilandi' : 'Qoida yaratildi')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Xato yuz berdi')
    },
  })

  function handleSave() {
    if (!name.trim()) {
      setNameError('Qoida nomi kiritilishi shart')
      return
    }
    setNameError('')
    saveMut.mutate()
  }

  // ─── Condition helpers ───────────────────────────────────────────────────

  function addCondition() {
    const fields = CONDITION_FIELDS[trigger] ?? []
    setConditions(prev => [...prev, {
      field:    fields[0]?.value ?? 'amount',
      operator: 'gte',
      value:    0,
    }])
  }

  function updateCondition(i: number, key: keyof AutomationCondition, val: any) {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }

  function removeCondition(i: number) {
    setConditions(prev => prev.filter((_, idx) => idx !== i))
  }

  // ─── Action helpers ──────────────────────────────────────────────────────

  function addAction() {
    setActions(prev => [...prev, { type: 'CREATE_NOTIFICATION', config: { title: '', message: '' } }])
  }

  function updateActionType(i: number, type: ActionType) {
    setActions(prev => prev.map((a, idx) =>
      idx === i ? { type, config: {} } : a
    ))
  }

  function updateActionConfig(i: number, key: string, val: string) {
    setActions(prev => prev.map((a, idx) =>
      idx === i ? { ...a, config: { ...a.config, [key]: val } } : a
    ))
  }

  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i))
  }

  const conditionFields = CONDITION_FIELDS[trigger] ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl"
        style={{
          background:   'var(--color-bg-secondary)',
          borderColor:  'var(--color-border-primary)',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-border-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-accent-primary)20' }}>
              <Zap size={16} style={{ color: 'var(--color-accent-primary)' }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isEdit ? 'Qoidani tahrirlash' : 'Yangi qoida yaratish'}
            </h2>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30">
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Asosiy ma'lumotlar */}
          <Section title="Asosiy" icon={Settings2}>
            <div className="space-y-3">
              <Field label={<>Qoida nomi <span style={{ color: 'var(--color-danger)' }}>*</span></>}>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
                  placeholder="Masalan: Muddati o'tgan hisoblarga eslatma"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    ...inputStyle,
                    ...(nameError ? { borderColor: 'var(--color-danger)' } : {}),
                  }}
                />
                {nameError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{nameError}</p>
                )}
              </Field>
              <Field label="Tavsif">
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ixtiyoriy"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
              </Field>

              <div className="flex items-center gap-4">
                <Field label="Qayta ishlamaslik (daqiqa)" className="flex-1">
                  <input
                    type="number"
                    min="0"
                    value={cooldownMin}
                    onChange={e => setCooldownMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </Field>
                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsActive(v => !v)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{
                      background: isActive ? 'var(--color-success)' : 'var(--color-border-primary)',
                    }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: isActive ? '1.5rem' : '0.25rem' }}
                    />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {isActive ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* Trigger */}
          <Section title="Qachon? (Trigger)" icon={Zap}>
            <div className="grid grid-cols-2 gap-2">
              {triggers.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTrigger(t.value); setConditions([]) }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all"
                  style={{
                    background:   trigger === t.value ? 'var(--color-accent-primary)20' : 'var(--color-bg-tertiary)',
                    border:       `1px solid ${trigger === t.value ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                    color:        trigger === t.value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    fontWeight:   trigger === t.value ? 600 : 400,
                  }}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Shartlar */}
          {conditionFields.length > 0 && (
            <Section title="Shartlar (ixtiyoriy)" icon={Info}>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                Hech qanday shart qo'shmasangiz — har doim ishga tushadi
              </p>
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={cond.field}
                      onChange={e => updateCondition(i, 'field', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    >
                      {conditionFields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={e => updateCondition(i, 'operator', e.target.value)}
                      className="px-2 py-2 rounded-lg text-sm outline-none"
                      style={{ ...inputStyle, minWidth: 140 }}
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={String(cond.value)}
                      onChange={e => updateCondition(i, 'value', Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    />
                    <button onClick={() => removeCondition(i)}
                      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors">
                      <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1.5 mt-3 text-sm transition-colors"
                style={{ color: 'var(--color-accent-primary)' }}
              >
                <Plus size={14} /> Shart qo'shish
              </button>
            </Section>
          )}

          {/* Harakatlar */}
          <Section title="Nima qilsin? (Harakatlar)" icon={Play}>
            <div className="space-y-4">
              {actions.map((action, i) => (
                <div key={i} className="rounded-xl p-4 border"
                  style={{
                    background:  'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border-primary)',
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <select
                      value={action.type}
                      onChange={e => updateActionType(i, e.target.value as ActionType)}
                      className="flex-1 mr-3 px-3 py-2 rounded-lg text-sm outline-none font-medium"
                      style={inputStyle}
                    >
                      {actionMetas.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    {actions.length > 1 && (
                      <button onClick={() => removeAction(i)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors">
                        <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    )}
                  </div>

                  {/* Harakat konfiguratsiyasi */}
                  <div className="space-y-2">
                    {(ACTION_FIELDS[action.type] ?? []).map(field => (
                      <Field key={field.key} label={field.label}>
                        {field.key === 'body' || field.key === 'template' || field.key === 'message' ? (
                          <textarea
                            rows={3}
                            value={action.config[field.key] ?? ''}
                            onChange={e => updateActionConfig(i, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                            style={inputStyle}
                          />
                        ) : (
                          <input
                            value={action.config[field.key] ?? ''}
                            onChange={e => updateActionConfig(i, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                            style={inputStyle}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addAction}
              className="flex items-center gap-1.5 mt-3 text-sm transition-colors"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              <Plus size={14} /> Harakat qo'shish
            </button>

            {/* Trigger-specific template o'zgaruvchilari */}
            {(TRIGGER_VARS[trigger] ?? []).length > 0 && (
              <div className="mt-3 p-3 rounded-lg text-xs"
                style={{
                  background: 'var(--color-accent-primary)10',
                  color:      'var(--color-text-muted)',
                  border:     '1px solid var(--color-accent-primary)20',
                }}>
                <strong style={{ color: 'var(--color-text-secondary)' }}>
                  Bu trigger uchun o'zgaruvchilar:
                </strong>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(TRIGGER_VARS[trigger] ?? []).map(v => (
                    <code key={v}
                      className="px-1.5 py-0.5 rounded cursor-pointer hover:opacity-70"
                      style={{ background: 'var(--color-accent-primary)20', color: 'var(--color-accent-primary)' }}
                      title="Nusxa olish uchun bosing"
                      onClick={() => navigator.clipboard?.writeText(`{{${v}}}`)}
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--color-border-primary)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--color-bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={actions.length === 0 || saveMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
            style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
          >
            <Save size={15} />
            {saveMut.isPending ? 'Saqlanmoqda...' : (isEdit ? 'Saqlash' : 'Yaratish')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Yordamchi komponentlar ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background:  'var(--color-bg-secondary)',
  border:      '1px solid var(--color-border-primary)',
  color:       'var(--color-text-primary)',
}

function Section({
  title, icon: Icon, children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} style={{ color: 'var(--color-accent-primary)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function Field({
  label, children, className = '',
}: {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
