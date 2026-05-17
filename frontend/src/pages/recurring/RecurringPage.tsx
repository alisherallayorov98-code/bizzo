import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Power, Repeat, Calendar, AlertCircle, Pencil } from 'lucide-react'
import { PageHeader }    from '@components/layout/PageHeader/PageHeader'
import { Button }        from '@components/ui/Button/Button'
import { Card }          from '@components/ui/Card/Card'
import { Badge }         from '@components/ui/Badge/Badge'
import { Modal }         from '@components/ui/Modal/Modal'
import { EmptyState }    from '@components/ui/EmptyState/EmptyState'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { useContacts }   from '@features/contacts/hooks/useContacts'
import api from '@config/api'
import { formatCurrency, formatDate } from '@utils/formatters'

interface RecurringRule {
  id:         string
  type:       'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT'
  title:      string
  amount:     string | number
  currency:   string
  notes?:     string
  category?:  string
  contactId?: string
  frequency:  'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfMonth?: number
  dayOfWeek?:  number
  startsAt:   string
  endsAt?:    string
  lastRunAt?: string
  nextRunAt:  string
  runCount:   number
  isActive:   boolean
}

const TYPE_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'info' }> = {
  EXPENSE:      { label: 'Xarajat',      variant: 'warning' },
  INCOME:       { label: 'Daromad',      variant: 'success' },
  DEBT_PAYMENT: { label: "Qarz to'lovi", variant: 'info'    },
}

const FREQ_LABELS: Record<string, string> = {
  DAILY:   'Har kuni',
  WEEKLY:  'Har hafta',
  MONTHLY: 'Har oy',
}

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

const MONTH_NAMES = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']

function computeNextDates(
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  startsAt: string,
  dayOfMonth?: number,
  dayOfWeek?: number,
  count = 3,
): string[] {
  const base = new Date(startsAt || new Date())
  const dates: Date[] = []
  const cur = new Date(base)
  cur.setHours(0, 0, 0, 0)

  while (dates.length < count) {
    if (frequency === 'DAILY') {
      if (dates.length === 0) cur.setDate(cur.getDate() + 1)
      else cur.setDate(cur.getDate() + 1)
      dates.push(new Date(cur))
    } else if (frequency === 'WEEKLY') {
      cur.setDate(cur.getDate() + 1)
      if (cur.getDay() === (dayOfWeek ?? 1)) dates.push(new Date(cur))
    } else {
      cur.setMonth(cur.getMonth() + 1)
      const day = Math.min(dayOfMonth ?? 1, new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate())
      dates.push(new Date(cur.getFullYear(), cur.getMonth(), day))
    }
    if (dates.length >= 50) break
  }

  return dates.slice(0, count).map(d => `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}`)
}

function NextRunPreview({ frequency, startsAt, dayOfMonth, dayOfWeek }: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  startsAt:   string
  dayOfMonth?: number
  dayOfWeek?:  number
}) {
  const dates = useMemo(
    () => computeNextDates(frequency, startsAt, dayOfMonth, dayOfWeek),
    [frequency, startsAt, dayOfMonth, dayOfWeek],
  )
  if (!dates.length) return null
  return (
    <p className="text-xs text-[var(--color-text-muted)] mt-1">
      Keyingi bajarilishlar: <span className="font-medium text-[var(--color-text-secondary)]">{dates.join(', ')}</span>
    </p>
  )
}

export default function RecurringPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRule,   setEditRule]   = useState<RecurringRule | null>(null)

  const { data: rules = [], isLoading } = useQuery<RecurringRule[]>({
    queryKey: ['recurring'],
    queryFn:  async () => (await api.get('/recurring')).data.data,
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.patch(`/recurring/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      toast.success("O'chirildi")
    },
  })

  return (
    <div>
      <PageHeader
        title="Takroriy operatsiyalar"
        description="Ish haqi, ijara, obuna kabi har oy/hafta takrorlanadigan to'lovlar"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Takroriy operatsiyalar' },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Yangi qoida
          </Button>
        }
      />

      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary bg-bg-tertiary/30">
              {['Sarlavha', 'Tur', 'Davriylik', 'Summa', 'Keyingi', 'Bajarilgan', 'Holat', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={<Repeat size={28} />}
                    title="Hali takroriy qoida yo'q"
                    description="Oylik ijara, telefon obunasi, soliq kabi takroriy to'lovlar"
                  />
                </td>
              </tr>
            ) : rules.map(r => (
              <tr key={r.id} className="border-b border-border-primary hover:bg-bg-tertiary/40">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-text-primary" title={r.notes || undefined}>{r.title}</p>
                  {r.notes && <p className="text-xs text-text-muted truncate max-w-xs">{r.notes}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={TYPE_LABELS[r.type].variant} size="sm">{TYPE_LABELS[r.type].label}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {FREQ_LABELS[r.frequency]}
                  {r.frequency === 'WEEKLY'  && r.dayOfWeek  !== undefined && r.dayOfWeek !== null && (
                    <span className="text-xs text-text-muted"> · {WEEKDAYS[r.dayOfWeek]}</span>
                  )}
                  {r.frequency === 'MONTHLY' && r.dayOfMonth !== undefined && r.dayOfMonth !== null && (
                    <span className="text-xs text-text-muted"> · {r.dayOfMonth}-kuni</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums font-semibold text-text-primary">{formatCurrency(Number(r.amount))}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  <Calendar size={11} className="inline mr-1" />
                  {formatDate(r.nextRunAt)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{r.runCount} marta</td>
                <td className="px-4 py-3">
                  <Badge variant={r.isActive ? 'success' : 'default'} size="sm">
                    {r.isActive ? 'Faol' : "To'xtatilgan"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="xs" onClick={() => setEditRule(r)} title="Tahrirlash">
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => toggleMut.mutate(r.id)} title={r.isActive ? "To'xtatish" : 'Yoqish'}>
                      <Power size={13} />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => { if (confirm("Haqiqatan o'chirilsinmi?")) deleteMut.mutate(r.id) }} className="hover:text-danger hover:bg-danger/10">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <CreateRecurringModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editRule && (
        <EditRecurringModal rule={editRule} onClose={() => setEditRule(null)} />
      )}
    </div>
  )
}

function CreateRecurringModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [type, setType]             = useState<'EXPENSE' | 'INCOME' | 'DEBT_PAYMENT'>('EXPENSE')
  const [title, setTitle]           = useState('')
  const [amount, setAmount]         = useState('')
  const [notes, setNotes]           = useState('')
  const [contactId, setContactId]   = useState('')
  const [frequency, setFrequency]   = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [dayOfWeek, setDayOfWeek]   = useState(1)
  const [startsAt, setStartsAt]     = useState(new Date().toISOString().slice(0, 10))

  const { data: contactsResult } = useContacts({ limit: 100 })
  const contacts = contactsResult?.data ?? []

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/recurring', dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Qoida yaratildi')
      onClose()
      setTitle(''); setAmount(''); setNotes(''); setContactId('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })

  const handleSave = () => {
    if (!title.trim() || !amount) return
    createMut.mutate({
      type,
      title:      title.trim(),
      amount:     parseFloat(amount),
      notes:      notes.trim() || undefined,
      contactId:  type === 'DEBT_PAYMENT' ? contactId : undefined,
      frequency,
      dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
      dayOfWeek:  frequency === 'WEEKLY'  ? dayOfWeek  : undefined,
      startsAt,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi takroriy operatsiya"
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor qilish</Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={createMut.isPending} disabled={!title.trim() || !amount}>
            Yaratish
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Tur</label>
          <div className="flex gap-2 mt-1">
            {(['EXPENSE', 'INCOME', 'DEBT_PAYMENT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
              >
                {TYPE_LABELS[t].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Sarlavha *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Misol: Ofis ijarasi"
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Summa *</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="2 000 000"
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Davriylik</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
            >
              <option value="DAILY">Har kuni</option>
              <option value="WEEKLY">Har hafta</option>
              <option value="MONTHLY">Har oy</option>
            </select>
          </div>
          {frequency === 'WEEKLY' && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase">Hafta kuni</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm">
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {frequency === 'MONTHLY' && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase">Oyning kuni</label>
              <input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums"
              />
              {dayOfMonth > 27 && (
                <p className="text-xs text-text-muted mt-1">Max 28 — ba'zi oylarda xavfsiz ishlash uchun</p>
              )}
            </div>
          )}
        </div>
        <NextRunPreview frequency={frequency} startsAt={startsAt} dayOfMonth={dayOfMonth} dayOfWeek={dayOfWeek} />
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Boshlanish sanasi</label>
          <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm" />
        </div>
        {type === 'DEBT_PAYMENT' && (
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Kontakt</label>
            <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm">
              <option value="">Tanlang...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Izoh</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
          />
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// TAHRIRLASH MODALI
// ============================================
function EditRecurringModal({ rule, onClose }: { rule: RecurringRule; onClose: () => void }) {
  const qc = useQueryClient()
  const [title,      setTitle]      = useState(rule.title)
  const [amount,     setAmount]     = useState(String(rule.amount))
  const [notes,      setNotes]      = useState(rule.notes ?? '')
  const [frequency,  setFrequency]  = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>(rule.frequency)
  const [dayOfMonth, setDayOfMonth] = useState(rule.dayOfMonth ?? 1)
  const [dayOfWeek,  setDayOfWeek]  = useState(rule.dayOfWeek  ?? 1)

  const editMut = useMutation({
    mutationFn: (dto: any) => api.patch(`/recurring/${rule.id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Yangilandi')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })

  const handleSave = () => {
    if (!title.trim() || !amount) return
    editMut.mutate({
      title:      title.trim(),
      amount:     parseFloat(amount),
      notes:      notes.trim() || undefined,
      frequency,
      dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
      dayOfWeek:  frequency === 'WEEKLY'  ? dayOfWeek  : undefined,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Takroriy operatsiyani tahrirlash"
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor qilish</Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={editMut.isPending} disabled={!title.trim() || !amount}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Sarlavha *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Summa *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Davriylik</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm">
              <option value="DAILY">Har kuni</option>
              <option value="WEEKLY">Har hafta</option>
              <option value="MONTHLY">Har oy</option>
            </select>
          </div>
          {frequency === 'WEEKLY' && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase">Hafta kuni</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm">
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {frequency === 'MONTHLY' && (
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase">Oyning kuni</label>
              <input type="number" min={1} max={28} value={dayOfMonth}
                onChange={e => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums" />
            </div>
          )}
        </div>
        <NextRunPreview frequency={frequency} startsAt={rule.startsAt} dayOfMonth={dayOfMonth} dayOfWeek={dayOfWeek} />
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Izoh</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm" />
        </div>
      </div>
    </Modal>
  )
}
