import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Eye, CheckCircle2, XCircle,
  Plus, DollarSign, FileText, Printer,
} from 'lucide-react'
import { PageHeader }  from '@components/layout/PageHeader/PageHeader'
import { Button }      from '@components/ui/Button/Button'
import { Card }        from '@components/ui/Card/Card'
import { Badge }       from '@components/ui/Badge/Badge'
import { Modal }       from '@components/ui/Modal/Modal'
import { Input }       from '@components/ui/Input/Input'
import { Skeleton }    from '@components/ui/Skeleton/Skeleton'
import {
  useGetInvoice, useUpdateInvoiceStatus, useAddPayment,
} from '@features/sales-module/hooks/useSales'
import { useCompanySettings } from '@features/settings/hooks/useSettings'
import { InvoicePDFDoc, PDFDownloadButton } from '@features/pdf'
import { formatCurrency, formatDate, formatDateTime } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

// ============================================
// STATUS BADGE
// ============================================
function InvoiceStatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; variant: 'default'|'info'|'warning'|'success'|'danger' }> = {
    DRAFT:     { label: 'Qoralama',          variant: 'default' },
    SENT:      { label: 'Yuborildi',          variant: 'info' },
    VIEWED:    { label: "Ko'rildi",           variant: 'info' },
    PARTIAL:   { label: 'Qisman to\'langan', variant: 'warning' },
    PAID:      { label: "To'langan",          variant: 'success' },
    OVERDUE:   { label: 'Muddati o\'tgan',   variant: 'danger' },
    CANCELLED: { label: 'Bekor qilingan',    variant: 'danger' },
  }
  const m = MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={m.variant} size="md">{m.label}</Badge>
}

// ============================================
// ADD PAYMENT MODAL
// ============================================
function AddPaymentModal({
  invoiceId, remaining, open, onClose,
}: { invoiceId: string; remaining: number; open: boolean; onClose: () => void }) {
  const { mutate, isPending } = useAddPayment()
  const [amount, setAmount]   = useState(String(Math.round(remaining)))
  const [method, setMethod]   = useState('CASH')
  const [notes,  setNotes]    = useState('')

  const METHODS = [
    { value: 'CASH',     label: 'Naqd' },
    { value: 'TRANSFER', label: "Bank o'tkazma" },
    { value: 'CARD',     label: 'Karta' },
  ]

  function handlePay() {
    mutate({ invoiceId, amount: Number(amount), method, notes: notes || undefined }, {
      onSuccess: () => { onClose(); setNotes('') },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="To'lov qo'shish" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Qolgan: <span className="font-semibold text-text-primary">{formatCurrency(remaining)}</span>
        </p>

        <div className="flex gap-2">
          {METHODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all',
                method === m.value
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'border-border-primary text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Input
          type="number"
          label="Summa (so'm)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <Input
          label="Izoh (ixtiyoriy)"
          placeholder="To'lov uchun izoh..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button
            variant="primary"
            leftIcon={<DollarSign size={14} />}
            onClick={handlePay}
            disabled={!amount || Number(amount) <= 0 || isPending}
          >
            To'lovni tasdiqlash
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function SalesInvoiceDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t        = useT()

  const { data: invoice, isLoading } = useGetInvoice(id!)
  const { data: company } = useCompanySettings()
  const updateStatus = useUpdateInvoiceStatus()
  const [payModal, setPayModal] = useState(false)

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64 rounded" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )

  if (!invoice) return (
    <div className="text-center py-20 text-text-muted">Invoice topilmadi</div>
  )

  const remaining = invoice.totalAmount - invoice.paidAmount
  const paidPct   = invoice.totalAmount > 0
    ? Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100)
    : 0

  const canMarkSent     = invoice.status === 'DRAFT'
  const canMarkViewed   = invoice.status === 'SENT'
  const canAddPayment   = !['PAID', 'CANCELLED'].includes(invoice.status)
  const canCancel       = !['PAID', 'CANCELLED'].includes(invoice.status)

  return (
    <div className="space-y-5">
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.contact?.name ?? '—'} • ${formatDate(invoice.createdAt)}`}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: 'Savdo',            path: '/sales' },
          { label: 'Invoicelar',       path: '/sales/invoices' },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
              Orqaga
            </Button>
            {company && (
              <PDFDownloadButton
                document={<InvoicePDFDoc invoice={invoice as any} company={company} />}
                fileName={`invoice_${invoice.invoiceNumber}.pdf`}
                label="PDF"
                showPreview
              />
            )}
            {canMarkSent && (
              <Button
                variant="secondary"
                leftIcon={<Send size={14} />}
                onClick={() => updateStatus.mutate({ id: id!, status: 'SENT' })}
                disabled={updateStatus.isPending}
              >
                Yuborildi
              </Button>
            )}
            {canMarkViewed && (
              <Button
                variant="secondary"
                leftIcon={<Eye size={14} />}
                onClick={() => updateStatus.mutate({ id: id!, status: 'VIEWED' })}
                disabled={updateStatus.isPending}
              >
                Ko'rildi
              </Button>
            )}
            {canAddPayment && (
              <Button
                variant="primary"
                leftIcon={<Plus size={14} />}
                onClick={() => setPayModal(true)}
              >
                To'lov qo'shish
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                leftIcon={<XCircle size={14} />}
                onClick={() => {
                  if (confirm('Invoiceni bekor qilasizmi?'))
                    updateStatus.mutate({ id: id!, status: 'CANCELLED' })
                }}
              >
                Bekor
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Info */}
        <div className="space-y-4">

          {/* Status card */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Holat</h3>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            {/* Payment progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">To'langan</span>
                <span className="font-semibold text-text-primary">{paidPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>

            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-xs text-text-muted">Jami summa</dt>
                <dd className="text-sm font-bold text-text-primary">{formatCurrency(invoice.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-text-muted">To'langan</dt>
                <dd className="text-sm font-semibold text-success">{formatCurrency(invoice.paidAmount)}</dd>
              </div>
              {remaining > 0.01 && (
                <div className="flex justify-between border-t border-border-primary pt-2">
                  <dt className="text-xs text-text-muted">Qolgan</dt>
                  <dd className="text-sm font-bold text-danger">{formatCurrency(remaining)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Details */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Ma'lumotlar</h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Kontakt',      value: invoice.contact?.name ?? '—' },
                { label: 'Yaratildi',    value: formatDate(invoice.createdAt) },
                ...(invoice.dueDate ? [{ label: 'Muddati',  value: formatDate(invoice.dueDate) }] : []),
                ...(invoice.paidAt  ? [{ label: "To'landi", value: formatDateTime(invoice.paidAt) }] : []),
                ...(invoice.deal    ? [{ label: 'Deal',     value: `${invoice.deal.dealNumber} — ${invoice.deal.title}` }] : []),
                ...(invoice.notes   ? [{ label: 'Izoh',     value: invoice.notes }] : []),
              ].map(row => (
                <div key={row.label}>
                  <dt className="text-[10px] text-text-muted uppercase tracking-wider">{row.label}</dt>
                  <dd className="text-sm text-text-primary font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* RIGHT: Items + Payments */}
        <div className="lg:col-span-2 space-y-4">

          {/* Invoice items */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Mahsulotlar / Xizmatlar
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary">
                    {['Nomi', 'Miqdor', 'Narx', 'Chegirma', 'Jami'].map(h => (
                      <th key={h} className="pb-2 text-left text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map(item => (
                    <tr key={item.id} className="border-b border-border-primary/50 last:border-0">
                      <td className="py-2 text-text-primary font-medium">{item.name}</td>
                      <td className="py-2 text-text-secondary tabular-nums">{item.quantity} {item.unit}</td>
                      <td className="py-2 text-text-secondary tabular-nums">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-text-muted tabular-nums">
                        {item.discount > 0 ? `${item.discount}%` : '—'}
                      </td>
                      <td className="py-2 font-semibold text-text-primary tabular-nums">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-primary">
                    <td colSpan={4} className="pt-2 text-xs text-text-muted text-right pr-4">Subtotal:</td>
                    <td className="pt-2 text-sm font-semibold text-text-primary tabular-nums">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  {invoice.taxRate > 0 && (
                    <tr>
                      <td colSpan={4} className="text-xs text-text-muted text-right pr-4">
                        Soliq ({invoice.taxRate}%):
                      </td>
                      <td className="text-sm text-text-secondary tabular-nums">
                        {formatCurrency(invoice.taxAmount)}
                      </td>
                    </tr>
                  )}
                  {invoice.discount > 0 && (
                    <tr>
                      <td colSpan={4} className="text-xs text-text-muted text-right pr-4">
                        Chegirma ({invoice.discount}%):
                      </td>
                      <td className="text-sm text-success tabular-nums">
                        -{formatCurrency((invoice.subtotal + invoice.taxAmount) * invoice.discount / 100)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-border-primary">
                    <td colSpan={4} className="pt-2 text-sm font-bold text-text-primary text-right pr-4">
                      JAMI:
                    </td>
                    <td className="pt-2 text-base font-bold text-text-primary tabular-nums">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Payment history */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                To'lovlar tarixi ({invoice.payments?.length ?? 0})
              </h3>
              {canAddPayment && (
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={<Plus size={12} />}
                  onClick={() => setPayModal(true)}
                >
                  To'lov
                </Button>
              )}
            </div>
            {!invoice.payments?.length ? (
              <p className="text-sm text-text-muted text-center py-4">To'lovlar yo'q</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map(pay => (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-bg-tertiary"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={14} className="text-success" />
                      <div>
                        <p className="text-xs font-medium text-text-primary">
                          {pay.method === 'CASH' ? 'Naqd' : pay.method === 'TRANSFER' ? "Bank o'tkazma" : 'Karta'}
                        </p>
                        <p className="text-[10px] text-text-muted">{formatDateTime(pay.createdAt)}</p>
                        {pay.notes && <p className="text-[10px] text-text-secondary">{pay.notes}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success tabular-nums">
                      +{formatCurrency(pay.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <AddPaymentModal
        invoiceId={id!}
        remaining={remaining}
        open={payModal}
        onClose={() => setPayModal(false)}
      />
    </div>
  )
}
