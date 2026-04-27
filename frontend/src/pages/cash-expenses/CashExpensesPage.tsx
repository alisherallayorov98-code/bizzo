import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Edit2, Search, Calendar, Filter, Printer,
  Download, Wallet, AlertCircle, Truck, X, Check,
  TrendingDown, Phone, Star,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Button }     from '@components/ui/Button/Button'
import { Modal, ConfirmDialog } from '@components/ui/Modal/Modal'
import { KPICard }    from '@components/charts/KPICard/KPICard'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import api from '@config/api'
import { formatCurrency, formatDate } from '@utils/formatters'
import { printHTML } from '@utils/printDocument'
import { cn } from '@utils/cn'

// ============================================
// TYPES
// ============================================
interface Driver {
  id: string; name: string; phone?: string; carPlate?: string
  isPermanent: boolean; notes?: string; isActive: boolean
  totalPaid: string | number; payCount: number; lastPaidAt?: string
}

interface CashExpense {
  id: string; category: string; amount: number; currency: string
  driverId?: string
  driver?: { id: string; name: string; phone?: string; isPermanent: boolean } | null
  payeeName: string; payeePhone?: string; notes: string; receiptUrl?: string
  expenseDate: string; createdAt: string
}

interface ExpensesResponse {
  data: CashExpense[]
  meta: { total: number; page: number; limit: number; totalPages: number; totalAmount: number }
}

interface ExpenseStats {
  total: { amount: number; count: number }
  byCategory: Array<{ category: string; amount: number; count: number }>
  byDriver:   Array<{ driver: any; amount: number; count: number }>
  dailyAvg:   number
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  DELIVERY:       { label: 'Yetkazib berish',  color: 'text-info'    },
  TRANSPORT:      { label: 'Transport',         color: 'text-warning' },
  UTILITY:        { label: 'Kommunal',          color: 'text-accent-primary' },
  SUPPLIES:       { label: 'Kichik xaridlar',   color: 'text-text-secondary' },
  SALARY_ADVANCE: { label: 'Avans',             color: 'text-success' },
  OTHER:          { label: 'Boshqa',            color: 'text-text-muted' },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS)

// ============================================
// HAYDOVCHI AUTOCOMPLETE
// ============================================
function DriverPicker({
  value, onChange, onPick,
}: {
  value:    string  // payeeName text
  onChange: (name: string) => void
  onPick:   (driver: Driver | null, name: string, phone?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers', value],
    queryFn:  async () => (await api.get('/cash-expenses/drivers', { params: { search: value || undefined } })).data.data,
    enabled:  open,
  })

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ism (yangi yoki avvalgi haydovchi)"
        className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm"
      />
      {open && drivers.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          {drivers.map(d => (
            <button
              key={d.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onPick(d, d.name, d.phone); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-bg-tertiary border-b border-border-primary last:border-0"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                    {d.isPermanent && <Star size={11} className="text-warning fill-warning" />}
                    {d.name}
                  </p>
                  {d.phone && <p className="text-xs text-text-muted">{d.phone}</p>}
                </div>
                <p className="text-xs text-text-muted">{d.payCount} marta</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// CHIQIM YARATISH MODAL
// ============================================
function ExpenseFormModal({
  open, onClose, edit,
}: {
  open: boolean; onClose: () => void; edit?: CashExpense | null
}) {
  const qc = useQueryClient()
  const [category,    setCategory]   = useState<string>('DELIVERY')
  const [amount,      setAmount]     = useState('')
  const [driverId,    setDriverId]   = useState<string | undefined>()
  const [payeeName,   setPayeeName]  = useState('')
  const [payeePhone,  setPayeePhone] = useState('')
  const [notes,       setNotes]      = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [savePermanent, setSavePermanent] = useState(false)

  // Edit modeda ma'lumotlarni yuklash
  useState(() => {
    if (edit) {
      setCategory(edit.category)
      setAmount(String(edit.amount))
      setDriverId(edit.driverId)
      setPayeeName(edit.payeeName)
      setPayeePhone(edit.payeePhone ?? '')
      setNotes(edit.notes)
      setExpenseDate(edit.expenseDate.slice(0, 10))
    }
  })

  const reset = () => {
    setCategory('DELIVERY'); setAmount(''); setDriverId(undefined)
    setPayeeName(''); setPayeePhone(''); setNotes('')
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setSavePermanent(false)
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      // Agar yangi haydovchi sifatida saqlash kerak bo'lsa
      let useDriverId = driverId
      if (savePermanent && !driverId && payeeName.trim()) {
        const r = await api.post('/cash-expenses/drivers', {
          name:        payeeName.trim(),
          phone:       payeePhone.trim() || undefined,
          isPermanent: true,
        })
        useDriverId = r.data.data.id
      }

      const body = {
        category, amount: parseFloat(amount), driverId: useDriverId,
        payeeName: payeeName.trim(), payeePhone: payeePhone.trim() || undefined,
        notes: notes.trim(), expenseDate,
      }

      if (edit) return api.put(`/cash-expenses/${edit.id}`, body)
      return api.post('/cash-expenses', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-expenses'] })
      qc.invalidateQueries({ queryKey: ['cash-expense-stats'] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      toast.success(edit ? 'Yangilandi' : 'Saqlandi')
      reset(); onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })

  const canSave = amount && parseFloat(amount) > 0 && payeeName.trim() && notes.trim()

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={edit ? 'Chiqimni tahrirlash' : 'Kassadan chiqim'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); onClose() }}>Bekor qilish</Button>
          <Button variant="primary" size="sm" onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={!canSave}>
            {edit ? 'Yangilash' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Kategoriya */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Tur *</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                  category === cat
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated',
                )}
              >
                {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Summa + sana */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Summa (so'm) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="200 000"
              className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm tabular-nums"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase">Sana *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
            />
          </div>
        </div>

        {/* Qabul qiluvchi */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Qabul qiluvchi *</label>
          <DriverPicker
            value={payeeName}
            onChange={(v) => { setPayeeName(v); setDriverId(undefined) }}
            onPick={(d, name, phone) => {
              setDriverId(d?.id)
              setPayeeName(name)
              setPayeePhone(phone ?? '')
            }}
          />
          {driverId && (
            <p className="text-[11px] text-success mt-1 flex items-center gap-1">
              <Check size={11} /> Saqlangan haydovchi
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">Telefon (ixtiyoriy)</label>
          <input
            type="tel"
            value={payeePhone}
            onChange={e => setPayeePhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
          />
        </div>

        {/* Yangi haydovchi sifatida saqlash */}
        {!driverId && payeeName.trim() && !edit && (
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-primary/5 border border-accent-primary/20 cursor-pointer">
            <input
              type="checkbox"
              checked={savePermanent}
              onChange={e => setSavePermanent(e.target.checked)}
              className="w-4 h-4 accent-accent-primary"
            />
            <span className="text-sm text-text-primary">
              Doimiy haydovchi sifatida saqlash
              <span className="block text-[11px] text-text-muted">
                Keyingi safar avtomatik tavsiya qilinadi
              </span>
            </span>
          </label>
        )}

        {/* Izoh — MAJBURIY */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase">
            Izoh * <span className="text-danger">(majburiy)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Misol: Toshkent → Samarqand 5 ta kompyuter yetkazib berish"
            className="w-full px-3 py-2 mt-1 rounded-lg border border-border-primary bg-bg-secondary text-sm"
          />
          <p className="text-[11px] text-text-muted mt-1">
            Hisobotda nima uchun chiqim qilinganini tushunish uchun batafsil yozing
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function CashExpensesPage() {
  const today    = new Date().toISOString().slice(0, 10)
  const monthAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })()

  const [from,        setFrom]        = useState(monthAgo)
  const [to,          setTo]          = useState(today)
  const [category,    setCategory]    = useState('')
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [formOpen,    setFormOpen]    = useState(false)
  const [editItem,    setEditItem]    = useState<CashExpense | null>(null)
  const [deleteItem,  setDeleteItem]  = useState<CashExpense | null>(null)

  const qc = useQueryClient()

  const { data, isLoading } = useQuery<ExpensesResponse>({
    queryKey: ['cash-expenses', from, to, category, search, page],
    queryFn:  async () => (await api.get('/cash-expenses', {
      params: { from, to, category: category || undefined, search: search || undefined, page, limit: 50 },
    })).data.data,
  })

  const { data: stats } = useQuery<ExpenseStats>({
    queryKey: ['cash-expense-stats', from, to],
    queryFn:  async () => (await api.get('/cash-expenses/stats', { params: { from, to } })).data.data,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/cash-expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-expenses'] })
      qc.invalidateQueries({ queryKey: ['cash-expense-stats'] })
      toast.success("O'chirildi")
      setDeleteItem(null)
    },
  })

  const handlePrint = () => {
    if (!data) return
    const rows = data.data.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(e.expenseDate)}</td>
        <td>${CATEGORY_LABELS[e.category]?.label ?? e.category}</td>
        <td>${e.payeeName}${e.payeePhone ? ' · ' + e.payeePhone : ''}${e.driver?.isPermanent ? ' (doimiy)' : ''}</td>
        <td>${e.notes}</td>
        <td style="text-align:right; font-weight:600">${formatCurrency(e.amount)}</td>
      </tr>
    `).join('')

    const html = `
      <h1 style="margin:0 0 4px 0">Kassa xarajatlari hisoboti</h1>
      <p style="margin:0 0 16px 0; color:#555">
        Davr: ${formatDate(from)} — ${formatDate(to)}
        ${category ? ` · ${CATEGORY_LABELS[category]?.label ?? category}` : ''}
      </p>

      <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; font-size:12px">
        <thead style="background:#f3f4f6">
          <tr>
            <th>#</th><th>Sana</th><th>Tur</th><th>Kim oldi</th><th>Izoh</th><th>Summa</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#eef2ff; font-weight:700">
            <td colspan="5" style="text-align:right">Jami:</td>
            <td style="text-align:right">${formatCurrency(data.meta.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top:24px; font-size:11px; color:#666; text-align:right">
        Chop etilgan: ${new Date().toLocaleString('uz-UZ')}
      </p>
    `
    printHTML(html, `Kassa xarajatlari ${from} — ${to}`)
  }

  const handleExportCSV = () => {
    if (!data) return
    const header = ['Sana', 'Tur', 'Kim oldi', 'Telefon', 'Izoh', 'Summa']
    const rows = data.data.map(e => [
      formatDate(e.expenseDate),
      CATEGORY_LABELS[e.category]?.label ?? e.category,
      e.payeeName + (e.driver?.isPermanent ? ' (doimiy)' : ''),
      e.payeePhone ?? '',
      e.notes,
      e.amount,
    ])
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `kassa_xarajat_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const todayTotal = useMemo(() => {
    if (!data) return 0
    return data.data
      .filter(e => e.expenseDate.slice(0, 10) === today)
      .reduce((s, e) => s + e.amount, 0)
  }, [data, today])

  return (
    <div>
      <PageHeader
        title="Kassa xarajatlari"
        description="Kassadan chiqim — bir martalik xarajatlar, haydovchi to'lovlari"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Kassa xarajatlari' },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExportCSV}>
              CSV
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Printer size={14} />} onClick={handlePrint}>
              Chop etish
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditItem(null); setFormOpen(true) }}>
              Yangi chiqim
            </Button>
          </>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPICard
          title="Bugungi"
          value={formatCurrency(todayTotal)}
          icon={<Wallet size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
        />
        <KPICard
          title="Tanlangan davr"
          value={stats ? formatCurrency(stats.total.amount) : '—'}
          subtitle={`${stats?.total.count ?? 0} ta yozuv`}
          icon={<TrendingDown size={18} />}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <KPICard
          title="Kunlik o'rtacha"
          value={stats ? formatCurrency(stats.dailyAvg) : '—'}
          icon={<Calendar size={18} />}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
        <KPICard
          title="Haydovchilar"
          value={stats?.byDriver.length ?? '—'}
          subtitle="aktiv to'lov olganlar"
          icon={<Truck size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
      </div>

      {/* Kategoriya bo'yicha umumiy */}
      {stats && stats.byCategory.length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Kategoriya bo'yicha taqsimot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {stats.byCategory.map(c => (
              <button
                key={c.category}
                onClick={() => setCategory(category === c.category ? '' : c.category)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  category === c.category
                    ? 'border-accent-primary bg-accent-primary/5'
                    : 'border-border-primary bg-bg-secondary hover:bg-bg-tertiary',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {CATEGORY_LABELS[c.category]?.label ?? c.category}
                </p>
                <p className="text-sm font-bold tabular-nums text-text-primary mt-1">
                  {formatCurrency(c.amount)}
                </p>
                <p className="text-[10px] text-text-muted">{c.count} ta</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Filterlar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase text-text-muted block mb-1">Boshlanishi</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-md bg-bg-tertiary border border-border-primary text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-text-muted block mb-1">Tugashi</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-md bg-bg-tertiary border border-border-primary text-sm" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold uppercase text-text-muted block mb-1">Qidirish</label>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Ism, izoh, haydovchi..."
              className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border-primary text-sm"
            />
          </div>
          {category && (
            <Button variant="ghost" size="sm" leftIcon={<X size={13} />} onClick={() => setCategory('')}>
              {CATEGORY_LABELS[category]?.label} filterini olib tashlash
            </Button>
          )}
        </div>
      </Card>

      {/* Jadval */}
      <Card padding="none">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : !data?.data.length ? (
            <div className="py-16 text-center">
              <Wallet size={36} className="text-text-muted mx-auto mb-3 opacity-30" />
              <p className="text-sm text-text-muted">Yozuv topilmadi</p>
              <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={() => { setEditItem(null); setFormOpen(true) }} className="mt-3">
                Birinchi chiqimni yozish
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-tertiary/30">
                  {['Sana', 'Tur', 'Kim oldi', 'Izoh', 'Summa', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map(e => (
                  <tr key={e.id} className="border-b border-border-primary/40 hover:bg-bg-tertiary/40">
                    <td className="px-4 py-3 text-xs text-text-muted font-mono whitespace-nowrap">
                      {formatDate(e.expenseDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">{CATEGORY_LABELS[e.category]?.label ?? e.category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text-primary flex items-center gap-1">
                        {e.driver?.isPermanent && <Star size={11} className="text-warning fill-warning" />}
                        {e.payeeName}
                      </p>
                      {e.payeePhone && (
                        <p className="text-[11px] text-text-muted flex items-center gap-1">
                          <Phone size={10} /> {e.payeePhone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary max-w-md">
                      {e.notes}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-bold text-warning whitespace-nowrap">
                      −{formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="xs" onClick={() => { setEditItem(e); setFormOpen(true) }}>
                          <Edit2 size={13} />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setDeleteItem(e)} className="hover:text-danger hover:bg-danger/10">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-primary bg-bg-tertiary/30">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold uppercase text-text-muted">
                    Jami (joriy sahifa):
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums font-bold text-warning">
                    {formatCurrency(data.data.reduce((s, e) => s + e.amount, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <span className="text-xs text-text-muted">
              {data.meta.page} / {data.meta.totalPages} sahifa · jami {data.meta.total} ta · {formatCurrency(data.meta.totalAmount)}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Oldingi
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}>
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} edit={editItem} />

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMut.mutate(deleteItem.id)}
        title="Chiqimni o'chirish"
        description={deleteItem ? `"${deleteItem.notes.slice(0, 60)}" yozuvi o'chiriladi` : ''}
        confirmText="O'chirish"
        loading={deleteMut.isPending}
      />
    </div>
  )
}
