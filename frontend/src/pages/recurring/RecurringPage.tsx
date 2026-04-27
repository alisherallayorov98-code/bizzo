import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Power, Repeat, Calendar, AlertCircle } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button }     from '@components/ui/Button/Button'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Modal }      from '@components/ui/Modal/Modal'
import { useContacts } from '@features/contacts/hooks/useContacts'
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

export default function RecurringPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

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

      {isLoading ? (
        <Card><p className="text-text-muted text-sm">Yuklanmoqda...</p></Card>
      ) : rules.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Repeat size={36} className="text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm text-text-muted mb-1">Hali takroriy qoida yo'q</p>
            <p className="text-xs text-text-muted">Misol: oylik ijara, telefon obunasi, har oyda tashlanadigan oylik soliq</p>
          </div>
        </Card>
      ) : (
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
              {rules.map(r => (
                <tr key={r.id} className="border-b border-border-primary hover:bg-bg-tertiary/40">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-primary">{r.title}</p>
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
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold">{formatCurrency(Number(r.amount))}</td>
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
                      <Button variant="ghost" size="xs" onClick={() => toggleMut.mutate(r.id)} title={r.isActive ? "To'xtatish" : 'Yoqish'}>
                        <Power size={13} />
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => confirm("Haqiqatan o'chirilsinmi?") && deleteMut.mutate(r.id)} className="hover:text-danger hover:bg-danger/10">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateRecurringModal open={createOpen} onClose={() => setCreateOpen(false)} />
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
                max={31}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums"
              />
            </div>
          )}
        </div>
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
