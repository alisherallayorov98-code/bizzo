import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Plus, Phone, Mail, Calendar, DollarSign,
  FileText, Activity, CheckCircle2, Clock, MessageSquare,
  PhoneCall, Users, Briefcase, ChevronRight,
} from 'lucide-react'
import { PageHeader }  from '@components/layout/PageHeader/PageHeader'
import { Button }      from '@components/ui/Button/Button'
import { Card }        from '@components/ui/Card/Card'
import { Badge }       from '@components/ui/Badge/Badge'
import { Skeleton }    from '@components/ui/Skeleton/Skeleton'
import { Modal }    from '@components/ui/Modal/Modal'
import { Input }    from '@components/ui/Input/Input'
import { Textarea } from '@components/ui/Input/Input'
import {
  useGetDeal, useUpdateDeal, useUpdateStage, useAddActivity, useCreateInvoice,
} from '@features/sales-module/hooks/useSales'
import EditDealModal from './components/EditDealModal'
import { formatCurrency, formatDate, formatDateTime } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'
import type { DealActivity, ActivityType } from '@services/sales.service'

// ============================================
// ACTIVITY TYPE CONFIG
// ============================================
const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'CALL',          label: 'Qo\'ng\'iroq',    icon: <PhoneCall size={14} />,     color: 'text-success' },
  { value: 'EMAIL',         label: 'Email',           icon: <Mail size={14} />,           color: 'text-info' },
  { value: 'MEETING',       label: 'Uchrashuv',       icon: <Users size={14} />,          color: 'text-accent-primary' },
  { value: 'NOTE',          label: 'Izoh',            icon: <MessageSquare size={14} />,  color: 'text-text-secondary' },
  { value: 'TASK',          label: 'Vazifa',          icon: <CheckCircle2 size={14} />,   color: 'text-warning' },
  { value: 'STATUS_CHANGE', label: 'Holat o\'zgarishi', icon: <Activity size={14} />,    color: 'text-text-muted' },
]

function activityConfig(type: ActivityType) {
  return ACTIVITY_TYPES.find(t => t.value === type) ?? ACTIVITY_TYPES[3]
}

// ============================================
// STAGE BADGE
// ============================================
const STAGE_META: Record<string, { label: string; variant: 'default'|'info'|'warning'|'success'|'danger' }> = {
  LEAD:        { label: 'Lead',       variant: 'default' },
  QUALIFIED:   { label: 'Tekshirildi', variant: 'info' },
  PROPOSAL:    { label: 'Taklif',     variant: 'warning' },
  NEGOTIATION: { label: 'Muzokara',   variant: 'warning' },
  WON:         { label: 'Yutildi',    variant: 'success' },
  LOST:        { label: "Yo'qotildi", variant: 'danger' },
}

function StageBadge({ stage }: { stage: string }) {
  const meta = STAGE_META[stage] ?? { label: stage, variant: 'default' as const }
  return <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
}

// ============================================
// INVOICE STATUS BADGE
// ============================================
function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default'|'info'|'warning'|'success'|'danger' }> = {
    DRAFT:     { label: 'Qoralama',  variant: 'default' },
    SENT:      { label: 'Yuborildi', variant: 'info' },
    VIEWED:    { label: 'Ko\'rildi', variant: 'info' },
    PARTIAL:   { label: 'Qisman',   variant: 'warning' },
    PAID:      { label: "To'landi", variant: 'success' },
    OVERDUE:   { label: 'Muddati o\'tgan', variant: 'danger' },
    CANCELLED: { label: 'Bekor',    variant: 'danger' },
  }
  const m = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={m.variant} size="sm">{m.label}</Badge>
}

// ============================================
// ADD ACTIVITY MODAL
// ============================================
function AddActivityModal({
  dealId, open, onClose,
}: { dealId: string; open: boolean; onClose: () => void }) {
  const { mutate, isPending } = useAddActivity(dealId)
  const [type,        setType]        = useState<ActivityType>('NOTE')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [dueDate,     setDueDate]     = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    mutate({ type, title, description: description || undefined, dueDate: dueDate || undefined }, {
      onSuccess: () => { onClose(); setTitle(''); setDescription(''); setDueDate('') },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Aktivlik qo'shish" size="md">
      <div className="space-y-4">
        {/* Type selector */}
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.filter(t => t.value !== 'STATUS_CHANGE').map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                type === t.value
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'border-border-primary text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <Input
          label="Sarlavha"
          placeholder="Aktivlik sarlavhasi..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Textarea
          label="Tavsif (ixtiyoriy)"
          placeholder="Qo'shimcha ma'lumot..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        {(type === 'TASK' || type === 'MEETING' || type === 'CALL') && (
          <Input
            type="datetime-local"
            label="Sana"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!title.trim() || isPending}>
            Qo'shish
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// LOST REASON MODAL
// ============================================
function LostReasonModal({
  open, onClose, onConfirm,
}: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const REASONS = [
    "Narx mos kelmadi", "Raqobatchi yutdi", "Mijoz voz kechdi",
    "Byudjet yetmadi", "Muddatlar mos kelmadi", "Boshqa sabab",
  ]
  return (
    <Modal open={open} onClose={onClose} title="Deal yo'qotish sababi" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">Sababni tanlang yoki kiriting:</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-all',
                reason === r
                  ? 'bg-danger/10 text-danger border-danger/30'
                  : 'border-border-primary text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Input
          placeholder="Boshqa sabab..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button variant="danger" onClick={() => { onConfirm(reason); setReason('') }} disabled={!reason.trim()}>
            Tasdiqlash
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// DEAL → INVOICE MODAL
// ============================================
function ConvertToInvoiceModal({
  deal, open, onClose,
}: { deal: any; open: boolean; onClose: () => void }) {
  const createInvoice = useCreateInvoice()
  const navigate      = useNavigate()
  const [taxRate,  setTaxRate]  = useState('0')
  const [discount, setDiscount] = useState(String(deal.discount ?? 0))
  const [dueDate,  setDueDate]  = useState('')

  const items = (deal.items ?? []).map((item: any) => ({
    name:      item.name,
    quantity:  item.quantity,
    unit:      item.unit,
    price:     item.price,
    discount:  item.discount ?? 0,
  }))

  function handleCreate() {
    createInvoice.mutate({
      dealId:    deal.id,
      contactId: deal.contactId,
      taxRate:   Number(taxRate),
      discount:  Number(discount),
      dueDate:   dueDate || undefined,
      items:     items.length ? items : [{ name: deal.title, quantity: 1, unit: 'xizmat', price: deal.finalAmount, discount: 0 }],
    }, {
      onSuccess: (inv: any) => {
        onClose()
        navigate(`/sales/invoices/${inv.id}`)
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Invoice yaratish (deal asosida)" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
          <p className="text-xs text-text-muted mb-1">Deal</p>
          <p className="text-sm font-semibold text-text-primary">{deal.title}</p>
          <p className="text-xs text-text-secondary">{deal.contact?.name}</p>
        </div>

        {items.length > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-2">Mahsulotlar ({items.length} ta)</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs p-2 rounded bg-bg-tertiary">
                  <span className="text-text-secondary">{item.name} — {item.quantity} {item.unit}</span>
                  <span className="text-text-primary font-medium tabular-nums">
                    {formatCurrency(item.quantity * item.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            label="QQS (%)"
            value={taxRate}
            onChange={e => setTaxRate(e.target.value)}
          />
          <Input
            type="number"
            label="Chegirma (%)"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
          />
        </div>
        <Input
          type="date"
          label="To'lov muddati (ixtiyoriy)"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button
            variant="primary"
            leftIcon={<FileText size={14} />}
            onClick={handleCreate}
            disabled={createInvoice.isPending}
          >
            Invoice yaratish
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// QUOTATION MODAL
// ============================================
function QuotationModal({ deal, open, onClose }: { deal: any; open: boolean; onClose: () => void }) {
  if (!open) return null
  const items: any[] = deal.items ?? []
  const total = items.reduce((s: number, i: any) => s + i.quantity * i.price * (1 - (i.discount ?? 0) / 100), 0)
  const fmt   = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

  return (
    <Modal open={open} onClose={onClose} title="Taklif xati (Quotation)" size="lg">
      <div id="quotation-print-area" className="space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border-primary pb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">TAKLIF XATI</h2>
            <p className="text-sm text-text-secondary">№ {deal.dealNumber}</p>
            <p className="text-xs text-text-muted">{new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary">Mijoz:</p>
            <p className="text-sm text-text-secondary">{deal.contact?.name ?? '—'}</p>
            {deal.contact?.phone && <p className="text-xs text-text-muted">{deal.contact.phone}</p>}
          </div>
        </div>

        {/* Deal info */}
        <div className="bg-bg-tertiary rounded-lg p-3">
          <p className="text-sm font-semibold text-text-primary mb-1">{deal.title}</p>
          {deal.description && <p className="text-xs text-text-secondary">{deal.description}</p>}
        </div>

        {/* Items table */}
        {items.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted">Mahsulot/Xizmat</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted">Miqdor</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted">Narx</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted">Chegirma</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted">Jami</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => {
                const lineTotal = item.quantity * item.price * (1 - (item.discount ?? 0) / 100)
                return (
                  <tr key={i} className="border-b border-border-primary">
                    <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                    <td className="px-3 py-2 text-text-primary font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-right text-text-secondary">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-2 text-right text-text-secondary tabular-nums">{fmt(item.price)}</td>
                    <td className="px-3 py-2 text-right text-text-secondary">{item.discount ?? 0}%</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-bg-tertiary">
                <td colSpan={5} className="px-3 py-2 text-right text-sm font-bold text-text-primary">Jami:</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-accent-primary tabular-nums">{fmt(total)} so'm</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="text-center py-4 text-text-muted text-sm">
            <p className="font-semibold text-xl tabular-nums">{fmt(Number(deal.finalAmount ?? deal.amount ?? 0))} so'm</p>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Ushbu taklif {new Date(Date.now() + 14 * 86400000).toLocaleDateString('uz-UZ')} gacha amal qiladi.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-4 border-t border-border-primary pt-4">
        <Button variant="secondary" onClick={onClose}>Yopish</Button>
        <Button variant="primary" leftIcon={<FileText size={14} />} onClick={() => window.print()}>
          Chop etish
        </Button>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function SalesDealDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const t          = useT()

  const { data: deal, isLoading } = useGetDeal(id!)
  const updateStage  = useUpdateStage()
  const [activityModal,  setActivityModal]  = useState(false)
  const [lostModal,      setLostModal]      = useState(false)
  const [invoiceModal,   setInvoiceModal]   = useState(false)
  const [editModal,      setEditModal]      = useState(false)
  const [quotationModal, setQuotationModal] = useState(false)

  const STAGE_STEPS = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
  const currentIdx = deal ? STAGE_STEPS.indexOf(deal.stage) : -1

  function handleStageClick(stage: string) {
    if (!id || !deal) return
    if (stage === 'LOST') { setLostModal(true); return }
    updateStage.mutate({ id, stage })
  }

  function handleLostConfirm(reason: string) {
    if (!id) return
    updateStage.mutate({ id, stage: 'LOST', lostReason: reason })
    setLostModal(false)
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!deal) return (
    <div className="text-center py-20 text-text-muted">Deal topilmadi</div>
  )

  const isClosed = deal.stage === 'WON' || deal.stage === 'LOST'

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title={deal.title}
        description={`${deal.dealNumber} • ${deal.contact?.name ?? '—'}`}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: 'Savdo',            path: '/sales' },
          { label: 'Deallar',          path: '/sales/deals' },
          { label: deal.dealNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft size={15} />}
              onClick={() => navigate(-1)}
            >
              Orqaga
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Edit2 size={15} />}
              onClick={() => setEditModal(true)}
            >
              Tahrirlash
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileText size={15} />}
              onClick={() => setQuotationModal(true)}
            >
              Taklif xati
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileText size={15} />}
              onClick={() => setInvoiceModal(true)}
            >
              Invoice
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={15} />}
              onClick={() => setActivityModal(true)}
            >
              Aktivlik
            </Button>
          </div>
        }
      />

      {/* Stage progress bar */}
      {!isClosed && (
        <Card padding="md">
          <div className="flex items-center gap-1">
            {STAGE_STEPS.map((stage, idx) => {
              const isDone    = idx <= currentIdx
              const isCurrent = idx === currentIdx
              return (
                <div key={stage} className="flex-1 flex items-center gap-1">
                  <button
                    onClick={() => handleStageClick(stage)}
                    disabled={idx <= currentIdx || updateStage.isPending}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all text-center',
                      isCurrent  ? 'bg-accent-primary text-white' :
                      isDone     ? 'bg-success/15 text-success' :
                                   'bg-bg-tertiary text-text-muted hover:bg-bg-elevated hover:text-text-secondary cursor-pointer',
                    )}
                  >
                    {STAGE_META[stage]?.label ?? stage}
                  </button>
                  {idx < STAGE_STEPS.length - 1 && (
                    <ChevronRight size={12} className="text-text-muted shrink-0" />
                  )}
                </div>
              )
            })}
            <button
              onClick={() => setLostModal(true)}
              className="ml-2 px-3 py-2 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-all"
            >
              Yo'qotish
            </button>
          </div>
        </Card>
      )}

      {isClosed && (
        <Card padding="md">
          <div className="flex items-center gap-3">
            {deal.stage === 'WON' ? (
              <CheckCircle2 size={20} className="text-success" />
            ) : (
              <Clock size={20} className="text-danger" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {deal.stage === 'WON' ? 'Deal muvaffaqiyatli yopildi' : "Deal yo'qotildi"}
              </p>
              {deal.lostReason && (
                <p className="text-xs text-text-muted mt-0.5">Sabab: {deal.lostReason}</p>
              )}
              {deal.closedAt && (
                <p className="text-xs text-text-muted">{formatDateTime(deal.closedAt)}</p>
              )}
            </div>
            <StageBadge stage={deal.stage} />
          </div>
        </Card>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Details */}
        <div className="lg:col-span-1 space-y-4">

          {/* Contact */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Kontakt</h3>
            {deal.contact ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">{deal.contact.name}</p>
                {deal.contact.phone && (
                  <a href={`tel:${deal.contact.phone}`}
                    className="flex items-center gap-2 text-xs text-accent-primary hover:underline">
                    <Phone size={12} /> {deal.contact.phone}
                  </a>
                )}
                {(deal.contact as any).email && (
                  <a href={`mailto:${(deal.contact as any).email}`}
                    className="flex items-center gap-2 text-xs text-accent-primary hover:underline">
                    <Mail size={12} /> {(deal.contact as any).email}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">—</p>
            )}
          </Card>

          {/* Deal info */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Ma'lumotlar</h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Summa',    value: formatCurrency(deal.finalAmount),
                  sub: deal.discount > 0 ? `(${formatCurrency(deal.amount)} - ${deal.discount}% chegirma)` : undefined },
                { label: 'Ehtimollik', value: `${deal.probability}%` },
                { label: 'Manba',    value: deal.source ?? '—' },
                { label: 'Yaratildi', value: formatDate(deal.createdAt) },
                ...(deal.expectedCloseDate
                  ? [{ label: 'Yopilish sanasi', value: formatDate(deal.expectedCloseDate) }]
                  : []),
                ...(deal.notes ? [{ label: 'Izoh', value: deal.notes }] : []),
              ].map(row => (
                <div key={row.label}>
                  <dt className="text-[10px] text-text-muted uppercase tracking-wider">{row.label}</dt>
                  <dd className="text-sm text-text-primary font-medium">{row.value}</dd>
                  {row.sub && <dd className="text-xs text-text-muted">{row.sub}</dd>}
                </div>
              ))}

              {/* Assignee */}
              <div>
                <dt className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Mas'ul shaxs</dt>
                {deal.assignedTo ? (
                  <dd className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-[10px] font-bold text-accent-primary">
                      {deal.assignedTo.firstName?.[0] ?? '?'}
                    </div>
                    <span className="text-sm text-text-primary font-medium">
                      {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                    </span>
                  </dd>
                ) : (
                  <dd>
                    <button
                      onClick={() => setEditModal(true)}
                      className="text-xs text-accent-primary hover:underline"
                    >
                      + Tayinlash
                    </button>
                  </dd>
                )}
              </div>
            </dl>
          </Card>

          {/* Items */}
          {deal.items && deal.items.length > 0 && (
            <Card padding="md">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                Mahsulotlar ({deal.items.length})
              </h3>
              <div className="space-y-2">
                {deal.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-text-primary">{item.name}</p>
                      <p className="text-[10px] text-text-muted">
                        {item.quantity} {item.unit} × {formatCurrency(item.price)}
                        {item.discount > 0 && ` - ${item.discount}%`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-text-primary tabular-nums">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-border-primary pt-2 flex justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Jami:</span>
                  <span className="text-sm font-bold text-text-primary">{formatCurrency(deal.finalAmount)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Activities + Invoices */}
        <div className="lg:col-span-2 space-y-4">

          {/* Invoices */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Invoicelar ({deal.invoices?.length ?? 0})
              </h3>
              <Link to="/sales/invoices">
                <Button variant="ghost" size="xs" rightIcon={<ChevronRight size={12} />}>
                  Hammasi
                </Button>
              </Link>
            </div>
            {!deal.invoices?.length ? (
              <p className="text-sm text-text-muted text-center py-4">Invoice yo'q</p>
            ) : (
              <div className="space-y-2">
                {deal.invoices.map(inv => (
                  <Link
                    key={inv.id}
                    to={`/sales/invoices/${inv.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border-primary hover:bg-bg-tertiary transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-text-muted" />
                      <div>
                        <p className="text-sm font-mono font-semibold text-accent-primary group-hover:underline">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[10px] text-text-muted">{formatDate(inv.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary tabular-nums">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                        {inv.paidAmount > 0 && (
                          <p className="text-[10px] text-success">
                            {formatCurrency(inv.paidAmount)} to'landi
                          </p>
                        )}
                      </div>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Activities */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Aktivliklar ({deal.activities?.length ?? 0})
              </h3>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<Plus size={12} />}
                onClick={() => setActivityModal(true)}
              >
                Qo'shish
              </Button>
            </div>

            {!deal.activities?.length ? (
              <p className="text-sm text-text-muted text-center py-4">Aktivlik yo'q</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border-primary" />

                <div className="space-y-3">
                  {deal.activities.map((act: DealActivity) => {
                    const cfg = activityConfig(act.type)
                    return (
                      <div key={act.id} className="flex gap-3 relative">
                        {/* Icon dot */}
                        <div className={cn(
                          'relative z-10 w-9 h-9 rounded-full border border-border-primary bg-bg-elevated flex items-center justify-center shrink-0',
                          cfg.color,
                        )}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary">{act.title}</p>
                            <span className="text-[10px] text-text-muted shrink-0">
                              {formatDateTime(act.createdAt)}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-text-secondary mt-0.5">{act.description}</p>
                          )}
                          <p className="text-[10px] text-text-muted mt-1">
                            {cfg.label}
                            {act.createdBy && ` • ${act.createdBy.name}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      {deal && (
        <EditDealModal
          deal={deal}
          open={editModal}
          onClose={() => setEditModal(false)}
        />
      )}
      <AddActivityModal dealId={id!} open={activityModal} onClose={() => setActivityModal(false)} />
      <LostReasonModal
        open={lostModal}
        onClose={() => setLostModal(false)}
        onConfirm={handleLostConfirm}
      />
      {deal && (
        <ConvertToInvoiceModal
          deal={deal}
          open={invoiceModal}
          onClose={() => setInvoiceModal(false)}
        />
      )}
      {deal && (
        <QuotationModal
          deal={deal}
          open={quotationModal}
          onClose={() => setQuotationModal(false)}
        />
      )}
    </div>
  )
}
