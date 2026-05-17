import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FileText, Send, Eye, Trash2, Search, FileSpreadsheet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'
import { PageHeader }        from '@components/layout/PageHeader/PageHeader'
import { Card }              from '@components/ui/Card/Card'
import { Button }            from '@components/ui/Button/Button'
import { Badge }             from '@components/ui/Badge/Badge'
import { Input }             from '@components/ui/Input/Input'
import { Modal }             from '@components/ui/Modal/Modal'
import { EmptyState }        from '@components/ui/EmptyState/EmptyState'
import { TableRowSkeleton }  from '@components/ui/Skeleton/Skeleton'
import { exportToExcel }     from '@utils/exporters'
import { formatCurrency, formatDate } from '@utils/formatters'
import { useDebounce }       from '@hooks/useDebounce'
import { cn }                from '@utils/cn'

// ============================================
// STATUS CONFIG
// ============================================
const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' }> = {
  DRAFT:     { label: 'Qoralama',               variant: 'default'  },
  SENT:      { label: 'Yuborildi',              variant: 'info'     },
  APPROVED:  { label: 'Tasdiqlandi',            variant: 'success'  },
  REJECTED:  { label: 'Rad etildi',             variant: 'danger'   },
  EXPIRED:   { label: "Muddati o'tgan",         variant: 'warning'  },
  CONVERTED: { label: "Invoice ga o'tkazildi",  variant: 'default'  },
}

// ============================================
// HOOKS
// ============================================
function useQuotations(filters: any) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn:  () => api.get('/quotations', { params: filters }).then(r => r.data),
  })
}

function useContacts() {
  return useQuery({
    queryKey: ['contacts-all'],
    queryFn:  () => api.get('/contacts', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

function useDeals() {
  return useQuery({
    queryKey: ['deals-active'],
    queryFn:  () => api.get('/deals', { params: { limit: 200 } }).then(r => r.data.data ?? r.data),
  })
}

function useProducts() {
  return useQuery({
    queryKey: ['products-all'],
    queryFn:  () => api.get('/products', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

// ============================================
// FORMA SATRI
// ============================================
interface QLine {
  name:       string
  productId?: string
  quantity:   number
  unit:       string
  unitPrice:  number
  discount:   number
}

// ============================================
// FORMA MODALI
// ============================================
function QuotationFormModal({ onClose, editItem }: { onClose: () => void; editItem?: any }) {
  const qc = useQueryClient()
  const { data: contacts = [] } = useContacts()
  const { data: deals    = [] } = useDeals()
  const { data: products = [] } = useProducts()

  const [contactId,  setContactId]  = useState(editItem?.contactId  ?? '')
  const [dealId,     setDealId]     = useState(editItem?.dealId     ?? '')
  const [validUntil, setValidUntil] = useState(editItem?.validUntil ? editItem.validUntil.slice(0, 10) : '')
  const [notes,      setNotes]      = useState(editItem?.notes      ?? '')
  const [discount,   setDiscount]   = useState(editItem?.discount   ?? 0)
  const [taxRate,    setTaxRate]    = useState(editItem?.taxRate     ?? 0)
  const [lines, setLines] = useState<QLine[]>(
    editItem?.items?.map((i: any) => ({
      name: i.name, productId: i.productId, quantity: Number(i.quantity),
      unit: i.unit, unitPrice: Number(i.unitPrice), discount: Number(i.discount),
    })) ?? [{ name: '', productId: '', quantity: 1, unit: 'dona', unitPrice: 0, discount: 0 }]
  )
  const [contactError, setContactError] = useState('')

  const mutation = useMutation({
    mutationFn: (body: any) => editItem
      ? api.patch(`/quotations/${editItem.id}`, body).then(r => r.data)
      : api.post('/quotations', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast.success(editItem ? 'Yangilandi' : 'Taklifnoma yaratildi')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik yuz berdi'),
  })

  const addLine    = () => setLines(l => [...l, { name: '', productId: '', quantity: 1, unit: 'dona', unitPrice: 0, discount: 0 }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const setLine    = (i: number, field: keyof QLine, val: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))

  const onProductChange = (i: number, productId: string) => {
    const p = (products as any[]).find((x: any) => x.id === productId)
    if (p) setLines(l => l.map((ln, idx) => idx === i
      ? { ...ln, productId, name: p.name, unit: p.unit, unitPrice: Number(p.sellPrice) }
      : ln))
    else setLine(i, 'productId', productId)
  }

  const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0)
  const discAmt   = subtotal * (discount / 100)
  const afterDisc = subtotal - discAmt
  const taxAmt    = afterDisc * (taxRate / 100)
  const total     = afterDisc + taxAmt

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId) { setContactError("Mijozni tanlang"); return }
    if (lines.some(l => !l.name.trim())) { toast.error("Barcha mahsulot nomlarini kiriting"); return }
    setContactError('')
    mutation.mutate({ contactId, dealId: dealId || undefined, validUntil: validUntil || undefined, notes, discount, taxRate, items: lines })
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-primary)] px-3 py-2 focus:outline-none focus:border-[var(--color-accent-primary)]"
  const labelCls = "text-xs font-medium text-[var(--color-text-secondary)] mb-1 block"

  return (
    <Modal
      open
      onClose={onClose}
      title={editItem ? 'Taklifnomani tahrirlash' : 'Yangi taklifnoma'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor</Button>
          <Button variant="primary" size="sm" loading={mutation.isPending} onClick={e => submit(e as any)}>
            Saqlash
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={contactError ? 'text-xs font-medium text-[var(--color-danger)] mb-1 block' : labelCls}>
              Mijoz *
            </label>
            <select
              value={contactId}
              onChange={e => { setContactId(e.target.value); setContactError('') }}
              className={cn(inputCls, contactError && 'border-[var(--color-danger)]')}
            >
              <option value="">Tanlang...</option>
              {(contacts as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {contactError && <p className="text-xs text-[var(--color-danger)] mt-1">{contactError}</p>}
          </div>
          <div>
            <label className={labelCls}>Bitim (ixtiyoriy)</label>
            <select value={dealId} onChange={e => setDealId(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {(deals as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber} — {d.title}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Amal qilish muddati</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Izoh</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Chegirma %</label>
            <input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Soliq (QQS) %</label>
            <input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        {/* Mahsulot satrlari */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Mahsulotlar / Xizmatlar</span>
            <button type="button" onClick={addLine}
              className="text-xs text-[var(--color-accent-primary)] hover:underline">
              + Qo'shish
            </button>
          </div>
          <div className="grid grid-cols-[1fr_140px_80px_70px_90px_70px_28px] gap-1 text-xs text-[var(--color-text-muted)] px-1">
            <span>Nomi</span><span>Mahsulot</span><span>Miqdor</span><span>Birlik</span><span>Narx</span><span>Cheg.%</span><span/>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_80px_70px_90px_70px_28px] gap-1 items-center">
              <input value={line.name} onChange={e => setLine(i, 'name', e.target.value)}
                placeholder="Nomi *" className={cn(inputCls, 'py-1.5')} />
              <select value={line.productId ?? ''} onChange={e => onProductChange(i, e.target.value)}
                className={cn(inputCls, 'py-1.5 text-xs')}>
                <option value="">—</option>
                {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min={0} step="any" value={line.quantity}
                onChange={e => setLine(i, 'quantity', Number(e.target.value))}
                className={cn(inputCls, 'py-1.5')} />
              <input value={line.unit} onChange={e => setLine(i, 'unit', e.target.value)}
                className={cn(inputCls, 'py-1.5')} />
              <input type="number" min={0} step="any" value={line.unitPrice}
                onChange={e => setLine(i, 'unitPrice', Number(e.target.value))}
                className={cn(inputCls, 'py-1.5')} />
              <input type="number" min={0} max={100} value={line.discount}
                onChange={e => setLine(i, 'discount', Number(e.target.value))}
                className={cn(inputCls, 'py-1.5')} />
              <button type="button" onClick={() => removeLine(i)}
                className="text-[var(--color-danger)] hover:opacity-80 text-sm text-center">✕</button>
            </div>
          ))}
        </div>

        {/* Jami */}
        <div className="rounded-lg p-3 text-sm space-y-1 border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <div className="flex justify-between text-[var(--color-text-secondary)]">
            <span>Oraliq summa:</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[var(--color-danger)]">
              <span>Chegirma ({discount}%):</span><span>-{formatCurrency(discAmt)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-[var(--color-warning)]">
              <span>QQS ({taxRate}%):</span><span>+{formatCurrency(taxAmt)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[var(--color-text-primary)] border-t border-[var(--color-border-primary)] pt-1">
            <span>Jami:</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function QuotationsPage() {
  const qc = useQueryClient()
  const [showForm,     setShowForm]     = useState(false)
  const [editItem,     setEditItem]     = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuotations({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })
  const items = data?.data ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/quotations/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success("O'chirildi") },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })

  const sendMut = useMutation({
    mutationFn: (id: string) => api.patch(`/quotations/${id}/send`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Yuborildi') },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })

  const handleExport = () => {
    if (!items.length) return
    exportToExcel([{
      name: 'Taklifnomalar',
      data: items.map((q: any) => ({
        Raqam:       q.quoteNumber,
        Mijoz:       q.contact?.name ?? '—',
        Jami:        Number(q.totalAmount),
        Muddati:     q.validUntil ? formatDate(q.validUntil) : '—',
        Sana:        formatDate(q.createdAt),
        Holat:       STATUS_CFG[q.status]?.label ?? q.status,
      })),
    }], 'taklifnomalar')
  }

  return (
    <div>
      <PageHeader
        title="Taklifnomalar"
        description="Narx takliflari va bitim taklifnomalari"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Savdo', path: '/sales' },
          { label: 'Taklifnomalar' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => { setEditItem(null); setShowForm(true) }}
          >
            Yangi taklifnoma
          </Button>
        }
      />

      {/* Filter va qidiruv */}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Input
            placeholder="Raqam yoki mijoz bo'yicha qidirish..."
            leftIcon={<Search size={14} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex items-center gap-1 flex-wrap">
            {['', ...Object.keys(STATUS_CFG)].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-[var(--color-accent-primary)] text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-primary)]',
                )}
              >
                {s === '' ? 'Hammasi' : STATUS_CFG[s]?.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet size={14} />}
              onClick={handleExport}
              disabled={!items.length}
            >
              Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Jadval */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {['№', 'Mijoz', 'Jami', 'Amal muddati', 'Sana', 'Holat', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<FileText size={28} />}
                      title="Taklifnomalar yo'q"
                      description="Yangi taklifnoma yarating yoki filtrni o'zgartiring"
                    />
                  </td>
                </tr>
              ) : items.map((q: any) => {
                const st  = STATUS_CFG[q.status] ?? { label: q.status, variant: 'default' as const }
                const exp = q.validUntil && new Date(q.validUntil) < new Date() && q.status === 'SENT'
                return (
                  <tr key={q.id} className="border-b border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{q.quoteNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--color-text-secondary)]">{q.contact?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] tabular-nums">
                        {formatCurrency(Number(q.totalAmount))}
                      </span>
                    </td>
                    <td className={cn('px-4 py-3 text-sm', exp ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-muted)]')}>
                      {q.validUntil ? formatDate(q.validUntil) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDate(q.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={st.variant} size="sm">{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/sales/quotations/${q.id}`}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors rounded"
                          title="Ko'rish">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {q.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => { setEditItem(q); setShowForm(true) }}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-warning)] transition-colors rounded"
                              title="Tahrirlash">
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => sendMut.mutate(q.id)}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-info)] transition-colors rounded"
                              title="Yuborish">
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm("O'chirasizmi?")) deleteMut.mutate(q.id) }}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors rounded"
                              title="O'chirish">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <QuotationFormModal
          editItem={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}
