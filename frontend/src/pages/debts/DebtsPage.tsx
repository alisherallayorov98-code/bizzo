import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, AlertCircle, DollarSign,
  Plus, CheckCircle, Search, Download, MessageSquare,
  History, ArrowUpRight, ArrowDownLeft, Trash2,
  CreditCard, Banknote, ArrowLeftRight, Clock,
} from 'lucide-react'
import { exportToExcel }     from '@utils/exporters'
import { PageHeader }        from '@components/layout/PageHeader/PageHeader'
import { Card }              from '@components/ui/Card/Card'
import { Badge }             from '@components/ui/Badge/Badge'
import { Button }            from '@components/ui/Button/Button'
import { Input }             from '@components/ui/Input/Input'
import { Modal }             from '@components/ui/Modal/Modal'
import { TableRowSkeleton }  from '@components/ui/Skeleton/Skeleton'
import { EmptyState }        from '@components/ui/EmptyState/EmptyState'
import {
  useDebts, useDebtStats, useAddDebtPayment, useCreateDebt,
  useSendDebtReminder, useRemoveDebt,
  useAvans, useCreateAvans, useRemoveAvans, useDebtOne,
} from '@features/debts/hooks/useDebts'
import { useContacts }        from '@features/contacts/hooks/useContacts'
import { avansService }       from '@services/debt.service'
import type { DebtRecord, AvansRecord, DebtPayment } from '@services/debt.service'
import { useCompanySettings } from '@features/settings/hooks/useSettings'
import { DebtActPDFDoc, PDFIconButton } from '@features/pdf'
import { formatCurrency, formatDate }   from '@utils/formatters'
import { cn }                           from '@utils/cn'
import { useDebounce }                  from '@hooks/useDebounce'
import { AdvancedFilter }               from '@components/ui/AdvancedFilter/AdvancedFilter'
import type { FilterValues }            from '@components/ui/AdvancedFilter/AdvancedFilter'

type MainTab = 'RECEIVABLE' | 'PAYABLE' | 'AVANS_GIVEN' | 'AVANS_RECEIVED'

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Naqd', CARD: 'Karta', TRANSFER: "O'tkazma", AVANS: 'Avans', OTHER: 'Boshqa',
}
const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
  CASH:     { color: 'var(--color-success)',        bg: 'var(--color-success-bg, rgba(16,185,129,0.12))'     },
  CARD:     { color: 'var(--color-accent-primary)', bg: 'var(--color-accent-subtle)'                         },
  TRANSFER: { color: 'var(--color-info)',           bg: 'var(--color-info-bg, rgba(59,130,246,0.12))'        },
  AVANS:    { color: 'var(--color-warning)',        bg: 'var(--color-warning-bg, rgba(245,158,11,0.12))'     },
  OTHER:    { color: 'var(--color-text-muted)',     bg: 'var(--color-bg-tertiary)'                           },
}
const getMethodColor  = (m: string) => (METHOD_COLORS[m] ?? METHOD_COLORS.OTHER).color
const getMethodBg     = (m: string) => (METHOD_COLORS[m] ?? METHOD_COLORS.OTHER).bg

// ─── To'lov tarixi modali — to'liq yuklaydi ──────────────────────────────────

function PaymentHistoryModal({ debtId, onClose }: { debtId: string; onClose: () => void }) {
  const { data, isLoading } = useDebtOne(debtId)
  const debt = data?.data

  const pct = debt ? Math.round((debt.paidAmount / debt.amount) * 100) : 0

  return (
    <Modal open onClose={onClose} title="To'lov tarixi" size="md">
      {isLoading ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse"
              style={{ background: 'var(--color-bg-tertiary)' }} />
          ))}
        </div>
      ) : debt ? (
        <>
          {/* Sarlavha: kontakt + tavsif */}
          <div className="mb-4">
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {debt.contact?.name}
            </p>
            {debt.description && (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{debt.description}</p>
            )}
          </div>

          {/* Umumiy holat */}
          <div className="p-4 rounded-xl mb-4"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Jami qarz</p>
                <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(debt.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>To'langan</p>
                <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(debt.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Qoldi</p>
                <p className="font-bold tabular-nums text-sm"
                  style={{ color: debt.isPaid ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {debt.isPaid ? '✓ To\'liq' : formatCurrency(debt.remaining)}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-elevated)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: debt.isPaid ? 'var(--color-success)' : 'var(--color-accent-primary)' }} />
            </div>
            <p className="text-right text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{pct}%</p>
          </div>

          {/* To'lovlar ro'yxati */}
          {!debt.payments?.length ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Hali to'lov amalga oshirilmagan
            </p>
          ) : (
            <div className="space-y-2">
              {debt.payments.map((p: DebtPayment) => (
                <div key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: getMethodBg(p.method) }}>
                      <CreditCard size={13} style={{ color: getMethodColor(p.method) }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {METHOD_LABELS[p.method] ?? p.method}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={11} />
                    {formatDate(p.paymentDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </Modal>
  )
}

// ─── To'lov qo'shish modali ───────────────────────────────────────────────────

function AddPaymentModal({ debt, onClose }: { debt: DebtRecord; onClose: () => void }) {
  const [amount,  setAmount]  = useState('')
  const [method,  setMethod]  = useState<'CASH' | 'CARD' | 'TRANSFER' | 'AVANS' | 'OTHER'>('CASH')
  const [avansId, setAvansId] = useState('')
  const [date,    setDate]    = useState('')
  const [notes,   setNotes]   = useState('')

  const addPayment = useAddDebtPayment()

  // Kontakt bo'yicha mos avanslarni yuklash (faqat AVANS tanlanganda)
  const avansType = debt.type === 'PAYABLE' ? 'GIVEN' : 'RECEIVED'
  const { data: avansData } = useQuery({
    queryKey:  ['avans-for-contact', debt.contactId, avansType],
    queryFn:   () => avansService.getByContact(debt.contactId),
    enabled:   method === 'AVANS',
    staleTime: 30_000,
  })
  const availableAvans = (avansData ?? []).filter(a => a.type === avansType && !a.isFullyUsed)

  const maxAmount = debt.remaining
  const payAmount = Math.min(parseFloat(amount) || 0, maxAmount)
  const isFull    = payAmount > 0 && payAmount >= maxAmount - 0.01

  const selectedAvans = availableAvans.find(a => a.id === avansId)
  const avansErr = method === 'AVANS' && avansId && selectedAvans
    ? payAmount > selectedAvans.remaining
      ? `Avansda faqat ${formatCurrency(selectedAvans.remaining)} mavjud`
      : null
    : null

  const canSubmit = payAmount > 0 && !avansErr &&
    (method !== 'AVANS' || (Boolean(avansId) && availableAvans.length > 0))

  const handleSubmit = async () => {
    if (!canSubmit) return
    await addPayment.mutateAsync({
      debtId:      debt.id,
      amount:      payAmount,
      method,
      avansId:     method === 'AVANS' ? avansId : undefined,
      paymentDate: date || undefined,
      notes:       notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open onClose={onClose}
      title={debt.type === 'RECEIVABLE' ? 'To\'lov qabul qilish' : 'To\'lov amalga oshirish'}
      description={`${debt.contact?.name}${debt.description ? ' · ' + debt.description : ''}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor</Button>
          <Button variant="success" size="sm"
            loading={addPayment.isPending}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isFull ? 'Qarzni yopish' : 'To\'lov qilish'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Joriy holat */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl"
          style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Jami qarz</p>
            <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {formatCurrency(debt.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Qoldi</p>
            <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-danger)' }}>
              {formatCurrency(maxAmount)}
            </p>
          </div>
        </div>

        {/* To'lov usuli */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>To'lov usuli</p>
          <div className="grid grid-cols-5 gap-1">
            {(['CASH', 'CARD', 'TRANSFER', 'AVANS', 'OTHER'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMethod(m); setAvansId('') }}
                className="py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: method === m ? getMethodBg(m) : 'var(--color-bg-tertiary)',
                  border:     `1px solid ${method === m ? getMethodColor(m) : 'var(--color-border-primary)'}`,
                  color:      method === m ? getMethodColor(m) : 'var(--color-text-muted)',
                }}>
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Avans tanlash (faqat AVANS usulida) */}
        {method === 'AVANS' && (
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {avansType === 'GIVEN' ? 'Berilgan avansdan' : 'Olingan avansdan'} tanlang *
            </p>
            {availableAvans.length === 0 ? (
              <p className="text-xs p-2 rounded-lg text-center"
                style={{ background: 'var(--color-danger)10', color: 'var(--color-danger)' }}>
                Ushbu kontakt bo'yicha aktiv avans yo'q
              </p>
            ) : (
              <div className="space-y-1.5">
                {availableAvans.map(a => (
                  <label key={a.id}
                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background:  avansId === a.id ? 'var(--color-accent-primary)10' : 'var(--color-bg-tertiary)',
                      border:      `1px solid ${avansId === a.id ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                    }}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="avans"
                        checked={avansId === a.id}
                        onChange={() => setAvansId(a.id)}
                        className="accent-accent-primary" />
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {a.description}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums text-sm"
                      style={{ color: 'var(--color-warning)' }}>
                      {formatCurrency(a.remaining)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <Input
          label="Summa (so'm) *"
          type="number"
          placeholder={String(maxAmount)}
          hint={`Maks: ${formatCurrency(maxAmount)}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        {avansErr && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{avansErr}</p>
        )}

        {isFull && !avansErr && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-lg"
            style={{ background: 'var(--color-success)15', color: 'var(--color-success)' }}>
            <CheckCircle size={13} />
            Qarz to'liq yopiladi
          </div>
        )}

        <Input label="Sana" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Izoh" placeholder="Ixtiyoriy..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

// ─── Yangi qarz modali ────────────────────────────────────────────────────────

function NewDebtModal({ type, onClose }: { type: 'RECEIVABLE' | 'PAYABLE'; onClose: () => void }) {
  const { data: res } = useContacts({ limit: 300 })
  const contacts   = res?.data ?? []
  const createDebt = useCreateDebt()
  const [form, setForm] = useState({ contactId: '', description: '', amount: '', dueDate: '', notes: '' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    const amt = parseFloat(form.amount)
    if (!form.contactId || !form.description || !amt || amt <= 0) return
    await createDebt.mutateAsync({
      contactId: form.contactId, type,
      description: form.description,
      amount: amt,
      dueDate: form.dueDate || undefined,
      notes:   form.notes   || undefined,
    })
    onClose()
  }

  return (
    <Modal open onClose={onClose}
      title={type === 'RECEIVABLE' ? '↑ Yangi debitor qarz' : '↓ Yangi kreditor qarz'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor</Button>
          <Button variant="primary"   size="sm"
            loading={createDebt.isPending}
            disabled={!form.contactId || !form.description || !form.amount}
            onClick={handleSubmit}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {type === 'RECEIVABLE' ? 'Qarzdor *' : 'Kreditor *'}
          </label>
          <select value={form.contactId} onChange={e => f('contactId', e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm outline-none"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
            <option value="">Tanlang...</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Tavsif *" placeholder="Tovar, xizmat, shartnoma..." value={form.description} onChange={e => f('description', e.target.value)} />
        <Input label="Summa (so'm) *" type="number" placeholder="0" value={form.amount} onChange={e => f('amount', e.target.value)} />
        <Input label="To'lash muddati" type="date" value={form.dueDate} onChange={e => f('dueDate', e.target.value)} />
        <Input label="Izoh" placeholder="Shartnoma raqami..." value={form.notes} onChange={e => f('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

// ─── Yangi avans modali ────────────────────────────────────────────────────────

function NewAvansModal({ type, onClose }: { type: 'GIVEN' | 'RECEIVED'; onClose: () => void }) {
  const { data: res } = useContacts({ limit: 300 })
  const contacts    = res?.data ?? []
  const createAvans = useCreateAvans()
  const [form, setForm] = useState({ contactId: '', description: '', amount: '', notes: '' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    const amt = parseFloat(form.amount)
    if (!form.contactId || !form.description || !amt || amt <= 0) return
    await createAvans.mutateAsync({
      contactId: form.contactId, type,
      description: form.description,
      amount: amt,
      notes:  form.notes || undefined,
    })
    onClose()
  }

  const isGiven = type === 'GIVEN'

  return (
    <Modal open onClose={onClose}
      title={isGiven ? '↑ Avans berish (yetkazuvchiga)' : '↓ Avans qabul qilish (mijozdan)'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor</Button>
          <Button variant="primary"   size="sm"
            loading={createAvans.isPending}
            disabled={!form.contactId || !form.description || !form.amount}
            onClick={handleSubmit}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="p-3 rounded-xl text-xs"
          style={{
            background: isGiven ? '#F59E0B12' : '#3B82F612',
            border:     `1px solid ${isGiven ? '#F59E0B40' : '#3B82F640'}`,
            color:      isGiven ? '#F59E0B'   : '#3B82F6',
          }}>
          {isGiven
            ? 'Yetkazuvchiga oldindan to\'lov. Tovar/xizmat kelganda ushbu avans kreditor qarzdan ayiriladi.'
            : 'Mijoz sizga oldindan to\'lov amalga oshirdi. Tovar/xizmat berilganda ushbu avans debitor qarzdan ayiriladi.'}
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            {isGiven ? 'Yetkazuvchi *' : 'Mijoz *'}
          </label>
          <select value={form.contactId} onChange={e => f('contactId', e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm outline-none"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
            <option value="">Tanlang...</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Tavsif *" placeholder="Tovar uchun bo'nak, xizmat uchun oldindan to'lov..." value={form.description} onChange={e => f('description', e.target.value)} />
        <Input label="Summa (so'm) *" type="number" placeholder="0" value={form.amount} onChange={e => f('amount', e.target.value)} />
        <Input label="Izoh" placeholder="Qo'shimcha ma'lumot..." value={form.notes} onChange={e => f('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

// ─── Asosiy sahifa ────────────────────────────────────────────────────────────

export default function DebtsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab') ?? 'RECEIVABLE'
  const activeTab = (['RECEIVABLE','PAYABLE','AVANS_GIVEN','AVANS_RECEIVED'].includes(rawTab)
    ? rawTab : 'RECEIVABLE') as MainTab
  const overdueOnly = searchParams.get('overdue') === 'true'

  const setTab = (t: MainTab) => {
    const p = new URLSearchParams(searchParams)
    p.set('tab', t); p.delete('overdue')
    setSearchParams(p, { replace: true })
  }

  const [search,        setSearch]       = useState('')
  const [advFilters,    setAdvFilters]   = useState<FilterValues>({})
  const [payDebt,       setPayDebt]      = useState<DebtRecord | null>(null)
  const [historyDebtId, setHistoryDebtId]= useState<string | null>(null)
  const [newDebtType,   setNewDebtType]  = useState<'RECEIVABLE' | 'PAYABLE' | null>(null)
  const [newAvansType,  setNewAvansType] = useState<'GIVEN' | 'RECEIVED' | null>(null)

  const debounced  = useDebounce(search, 400)
  const sendRemind = useSendDebtReminder()
  const removeDebt = useRemoveDebt()
  const removeAvans= useRemoveAvans()

  const { data: company } = useCompanySettings()
  const { data: stats }   = useDebtStats()

  const isDebtTab  = activeTab === 'RECEIVABLE' || activeTab === 'PAYABLE'
  const isAvansTab = !isDebtTab

  const { data: debtsData, isLoading: debtsLoading } = useDebts(
    {
      type:      activeTab === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE',
      search:    debounced || undefined,
      isOverdue: overdueOnly || undefined,
      dateFrom:  advFilters.dateFrom,
      dateTo:    advFilters.dateTo,
      minAmount: advFilters.minAmount,
      maxAmount: advFilters.maxAmount,
    },
    isDebtTab
  )

  const { data: avansData, isLoading: avansLoading } = useAvans(
    { type: activeTab === 'AVANS_GIVEN' ? 'GIVEN' : 'RECEIVED', search: debounced || undefined },
    isAvansTab  // enabled faqat avans tabda
  )

  const debts = debtsData?.data?.data ?? []
  const avans = avansData?.data?.data ?? []
  const isLoading = isDebtTab ? debtsLoading : avansLoading

  const TABS = [
    { id: 'RECEIVABLE'    as MainTab, label: 'Debitorlar',    icon: TrendingUp,    color: '#10B981', value: stats ? formatCurrency(stats.receivable.total)   : '—', count: stats?.receivable.count,    overdue: stats?.receivable.overdueCount },
    { id: 'PAYABLE'       as MainTab, label: 'Kreditorlar',   icon: TrendingDown,  color: '#EF4444', value: stats ? formatCurrency(stats.payable.total)      : '—', count: stats?.payable.count,       overdue: stats?.payable.overdueCount },
    { id: 'AVANS_GIVEN'   as MainTab, label: 'Avans berildi', icon: ArrowUpRight,  color: '#F59E0B', value: stats ? formatCurrency(stats.avansGiven.total)   : '—', count: stats?.avansGiven.count },
    { id: 'AVANS_RECEIVED'as MainTab, label: 'Avans olindi',  icon: ArrowDownLeft, color: '#3B82F6', value: stats ? formatCurrency(stats.avansReceived.total): '—', count: stats?.avansReceived.count },
  ]

  return (
    <div>
      <PageHeader
        title="Qarz va Avans"
        description="Debitor / kreditor qarzlar va avans to'lovlar"
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Qarz va Avans' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}
              onClick={() => {
                const rows = isDebtTab
                  ? debts.map((d: DebtRecord) => ({
                      kontakt: d.contact?.name ?? '—', tavsif: d.description ?? '—',
                      tur: d.type === 'RECEIVABLE' ? 'Debitor' : 'Kreditor',
                      jami: d.amount, tolangan: d.paidAmount, qoldi: d.remaining,
                      muddat: d.dueDate ? formatDate(d.dueDate) : '—',
                      holat: d.isPaid ? 'To\'langan' : d.isOverdue ? 'Muddati o\'tgan' : 'Kutilmoqda',
                    }))
                  : avans.map((a: AvansRecord) => ({
                      kontakt: a.contact?.name ?? '—', tavsif: a.description,
                      tur: a.type === 'GIVEN' ? 'Berildi' : 'Olindi',
                      jami: a.amount, ishlatildi: a.usedAmount, qoldi: a.remaining,
                      holat: a.isFullyUsed ? 'Yakunlangan' : 'Aktiv',
                    }))
                exportToExcel([{ name: activeTab, data: rows }], activeTab.toLowerCase())
              }}>
              Excel
            </Button>
            {activeTab === 'RECEIVABLE'     && <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewDebtType('RECEIVABLE')}>Debitor qarz</Button>}
            {activeTab === 'PAYABLE'        && <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewDebtType('PAYABLE')}>Kreditor qarz</Button>}
            {activeTab === 'AVANS_GIVEN'    && <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewAvansType('GIVEN')}>Avans berish</Button>}
            {activeTab === 'AVANS_RECEIVED' && <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewAvansType('RECEIVED')}>Avans qabul</Button>}
          </div>
        }
      />

      {/* 4 tab — KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setTab(tab.id)}
            className="text-left rounded-xl p-4 border transition-all"
            style={{
              background:   activeTab === tab.id ? `${tab.color}12` : 'var(--color-bg-elevated)',
              borderColor:  activeTab === tab.id ? `${tab.color}50` : 'var(--color-border-primary)',
            }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <tab.icon size={14} style={{ color: tab.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{tab.label}</span>
              </div>
              {(tab as any).overdue > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                  style={{ background: 'var(--color-danger)20', color: 'var(--color-danger)' }}>
                  {(tab as any).overdue}⚠
                </span>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums" style={{ color: tab.color }}>{tab.value}</p>
            {tab.count !== undefined && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tab.count} ta</p>
            )}
          </button>
        ))}
      </div>

      {/* Sof balans strip */}
      {stats && (
        <div className="mb-4 px-4 py-2.5 rounded-xl border flex items-center justify-between"
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-primary)' }}>
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Sof qarz balansi:</span>
          </div>
          <span className="font-bold tabular-nums text-sm"
            style={{ color: stats.netBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {stats.netBalance >= 0 ? '+' : ''}{formatCurrency(Math.abs(stats.netBalance))}
            <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {stats.netBalance >= 0 ? '(Bizga qarzdorlar ko\'p)' : '(Biz qarzdormiz)'}
            </span>
          </span>
        </div>
      )}

      {/* Jadval */}
      <Card padding="none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          <Input placeholder="Kontakt nomi bo'yicha..."
            leftIcon={<Search size={14} />} value={search}
            onChange={e => setSearch(e.target.value)} className="sm:max-w-xs" />
          <AdvancedFilter
            values={advFilters}
            onChange={setAdvFilters}
            fields={[
              { key: 'date', label: 'Sana oralig\'i', type: 'daterange' },
              { key: 'minAmount', label: 'Minimal summa', type: 'number', placeholder: '0' },
              { key: 'maxAmount', label: 'Maksimal summa', type: 'number', placeholder: '10000000' },
            ]}
          />
          {isDebtTab && (
            <button onClick={() => {
              const p = new URLSearchParams(searchParams)
              overdueOnly ? p.delete('overdue') : p.set('overdue', 'true')
              setSearchParams(p, { replace: true })
            }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                overdueOnly ? 'border-danger bg-danger/10 text-danger' : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
              <AlertCircle size={12} />
              Faqat muddati o'tganlar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Kontakt / Tavsif', 'Jami / Jarayon', 'Qoldi', isDebtTab ? 'Muddat' : 'Sana', 'Holat', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : isDebtTab && debts.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={<DollarSign size={28} />}
                    title={overdueOnly ? 'Muddati o\'tgan qarzlar yo\'q' : 'Qarzlar yo\'q'}
                    description="Hammasi tartibda!" />
                </td></tr>
              ) : isAvansTab && avans.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={<Banknote size={28} />}
                    title="Avanslar yo'q"
                    description="Yangi avans qo'shing" />
                </td></tr>
              ) : isDebtTab ? (
                debts.map((d: DebtRecord) => {
                  const pct = d.amount > 0 ? Math.round((d.paidAmount / d.amount) * 100) : 0
                  return (
                    <tr key={d.id}
                      className={cn('border-b border-border-primary transition-colors group',
                        d.isOverdue ? 'hover:bg-danger/5' : 'hover:bg-bg-tertiary/50')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {d.isOverdue && <AlertCircle size={13} className="text-danger shrink-0" />}
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{d.contact?.name}</p>
                            {d.description && <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(d.amount)}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-success)' }} />
                          </div>
                          <span className="text-xs tabular-nums" style={{ color: 'var(--color-success)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {d.isPaid
                          ? <span className="text-sm" style={{ color: 'var(--color-success)' }}>✓ To'liq</span>
                          : <span className="text-sm font-bold tabular-nums" style={{ color: d.isOverdue ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{formatCurrency(d.remaining)}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {d.dueDate
                          ? <span className={cn('text-sm', d.isOverdue && 'text-danger font-medium')}>{formatDate(d.dueDate)}</span>
                          : <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {d.isPaid
                          ? <Badge variant="success" size="sm" dot>To'langan</Badge>
                          : d.isOverdue
                            ? <Badge variant="danger"  size="sm" dot pulse>Muddati o'tgan</Badge>
                            : <Badge variant="warning" size="sm" dot>Kutilmoqda</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!d.isPaid && (
                            <Button variant="success" size="xs" leftIcon={<CheckCircle size={11} />} onClick={() => setPayDebt(d)}>
                              To'lov
                            </Button>
                          )}
                          <Button variant="secondary" size="xs" leftIcon={<History size={11} />} onClick={() => setHistoryDebtId(d.id)}>
                            Tarix
                          </Button>
                          {company && (
                            <PDFIconButton
                              document={<DebtActPDFDoc debt={d as any} company={company} />}
                              fileName={`akt_${d.id.slice(-8)}.pdf`}
                              title="Akt PDF"
                            />
                          )}
                          {d.contact?.phone && !d.isPaid && (
                            <button title="SMS eslatma"
                              className="p-1.5 rounded hover:bg-white/10 transition-colors"
                              onClick={() => sendRemind.mutate(d.id)}>
                              <MessageSquare size={12} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                          )}
                          <button title="O'chirish"
                            className="p-1.5 rounded hover:bg-danger/10 transition-colors"
                            onClick={() => removeDebt.mutate(d.id)}>
                            <Trash2 size={12} style={{ color: 'var(--color-text-muted)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                avans.map((a: AvansRecord) => {
                  const pct = a.amount > 0 ? Math.round((a.usedAmount / a.amount) * 100) : 0
                  return (
                    <tr key={a.id} className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{a.contact?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{a.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{formatCurrency(a.amount)}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                            <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums" style={{ color: 'var(--color-warning)' }}>{pct}% ishlatildi</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {a.isFullyUsed
                          ? <span className="text-sm" style={{ color: 'var(--color-success)' }}>✓ To'liq</span>
                          : <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(a.remaining)}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{formatDate(a.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a.isFullyUsed
                          ? <Badge variant="success" size="sm" dot>Yakunlangan</Badge>
                          : <Badge variant="warning" size="sm" dot>Aktiv</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {!a.isFullyUsed && Number(a.usedAmount) === 0 && (
                            <button title="O'chirish"
                              className="p-1.5 rounded hover:bg-danger/10 transition-colors"
                              onClick={() => removeAvans.mutate(a.id)}>
                              <Trash2 size={12} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Oxirgi to'lovlar */}
      {stats?.recentPayments && stats.recentPayments.length > 0 && (
        <div className="mt-4 rounded-xl border p-4"
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-primary)' }}>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Clock size={14} />
            Oxirgi to'lovlar
          </p>
          <div className="space-y-1.5">
            {stats.recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: getMethodBg(p.method), color: getMethodColor(p.method) }}>
                    {METHOD_LABELS[p.method] ?? p.method}
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-success)' }}>
                    +{formatCurrency(p.amount)}
                  </span>
                  {p.debt?.contact?.name && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>— {p.debt.contact.name}</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(p.paymentDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modallar */}
      {payDebt      && <AddPaymentModal debt={payDebt} onClose={() => setPayDebt(null)} />}
      {historyDebtId && <PaymentHistoryModal debtId={historyDebtId} onClose={() => setHistoryDebtId(null)} />}
      {newDebtType  && <NewDebtModal  type={newDebtType}  onClose={() => setNewDebtType(null)}  />}
      {newAvansType && <NewAvansModal type={newAvansType} onClose={() => setNewAvansType(null)} />}
    </div>
  )
}
