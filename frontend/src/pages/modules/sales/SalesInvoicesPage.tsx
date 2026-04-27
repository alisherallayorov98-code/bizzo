import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Search, Download, Trash2 } from 'lucide-react'
import { exportInvoicePDF } from '@utils/exporters'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button }     from '@components/ui/Button/Button'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Input }      from '@components/ui/Input/Input'
import { Modal }      from '@components/ui/Modal/Modal'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import { useInvoices, useCreateInvoice, useAddPayment, useBulkDeleteInvoices } from '@features/sales-module/hooks/useSales'
import { useContacts } from '@features/contacts/hooks/useContacts'
import { useProducts } from '@features/products/hooks/useProducts'
import { BulkActionBar } from '@components/ui/BulkActionBar/BulkActionBar'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn }         from '@utils/cn'
import { useT }       from '@i18n/index'
import type { Invoice } from '@services/sales.service'

// ============================================
// STATUS BADGE
// ============================================
function InvoiceStatusBadge({ status }: { status: string }) {
  const t = useT()
  if (status === 'DRAFT')     return <Badge variant="default" size="sm">{t('contracts.draft')}</Badge>
  if (status === 'SENT')      return <Badge variant="info"    size="sm">{t('sales.statusSent')}</Badge>
  if (status === 'VIEWED')    return <Badge variant="info"    size="sm">{t('sales.statusViewed')}</Badge>
  if (status === 'PAID')      return <Badge variant="success" size="sm">{t('sales.statusPaid')}</Badge>
  if (status === 'PARTIAL')   return <Badge variant="warning" size="sm">{t('sales.statusPartial')}</Badge>
  if (status === 'OVERDUE')   return <Badge variant="danger"  size="sm">{t('sales.statusOverdue')}</Badge>
  if (status === 'CANCELLED') return <Badge variant="danger"  size="sm">{t('sales.statusCancelled')}</Badge>
  return <Badge size="sm">{status}</Badge>
}

// ============================================
// YANGI INVOICE MODAL
// ============================================
function NewInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { data: contacts } = useContacts({ limit: 200 })
  const { data: products } = useProducts({ limit: 500 })
  const createInvoice = useCreateInvoice()

  const [contactId, setContactId] = useState('')
  const [taxRate,   setTaxRate]   = useState('0')
  const [discount,  setDiscount]  = useState('0')
  const [dueDate,   setDueDate]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [items,     setItems]     = useState([
    { name: '', quantity: '1', unit: 'dona', price: '', discount: '0' },
  ])

  const subtotal = items.reduce((sum, item) => {
    const qty  = parseFloat(item.quantity) || 0
    const pr   = parseFloat(item.price)    || 0
    const disc = parseFloat(item.discount) || 0
    return sum + qty * pr * (1 - disc / 100)
  }, 0)

  const tax   = subtotal * ((parseFloat(taxRate) || 0) / 100)
  const total = (subtotal + tax) * (1 - (parseFloat(discount) || 0) / 100)

  const reset = () => {
    setContactId(''); setTaxRate('0'); setDiscount('0')
    setDueDate(''); setNotes('')
    setItems([{ name: '', quantity: '1', unit: 'dona', price: '', discount: '0' }])
  }

  const handleSubmit = async () => {
    if (!contactId || items.every(i => !i.name)) return
    await createInvoice.mutateAsync({
      contactId,
      taxRate:  parseFloat(taxRate)  || 0,
      discount: parseFloat(discount) || 0,
      dueDate:  dueDate || undefined,
      notes:    notes   || undefined,
      items: items
        .filter(i => i.name)
        .map(i => ({
          name:     i.name,
          quantity: parseFloat(i.quantity) || 1,
          unit:     i.unit,
          price:    parseFloat(i.price)    || 0,
          discount: parseFloat(i.discount) || 0,
        })),
    })
    reset()
    onClose()
  }

  const addRow = () =>
    setItems(p => [...p, { name: '', quantity: '1', unit: 'dona', price: '', discount: '0' }])
  const removeRow = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: string, val: string) =>
    setItems(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={t('sales.newInvoice')}
      description={t('sales.invoicesDesc')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); onClose() }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary" size="sm"
            loading={createInvoice.isPending}
            onClick={handleSubmit}
            disabled={!contactId}
          >
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {t('sales.colContact')} <span className="text-danger">*</span>
          </label>
          <select
            value={contactId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('sales.selectContact')}</option>
            {contacts?.data?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-text-secondary">
              {t('sales.productsServices')} *
            </label>
            <Button variant="ghost" size="xs" leftIcon={<Plus size={12} />} onClick={addRow}>
              {t('sales.addRowBtn')}
            </Button>
          </div>
          {/* Product autocomplete datalist */}
          <datalist id="invoice-products-list">
            {products?.data?.map((p: any) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>

          <div className="space-y-2">
            {items.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_60px_80px_60px_28px] gap-2 items-center">
                <input
                  list="invoice-products-list"
                  placeholder={t('sales.colName')}
                  value={row.name}
                  onChange={e => {
                    const val = e.target.value
                    updateRow(i, 'name', val)
                    const match = products?.data?.find((p: any) => p.name === val)
                    if (match) {
                      updateRow(i, 'price', String(match.sellPrice ?? ''))
                      updateRow(i, 'unit', match.unit ?? 'dona')
                    }
                  }}
                  className="h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                />
                <input
                  type="number" placeholder={t('sales.quantityPlaceholder')}
                  value={row.quantity}
                  onChange={e => updateRow(i, 'quantity', e.target.value)}
                  className="h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                />
                <input
                  placeholder={t('sales.unitPlaceholder')}
                  value={row.unit}
                  onChange={e => updateRow(i, 'unit', e.target.value)}
                  className="h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                />
                <input
                  type="number" placeholder={t('sales.pricePlaceholder')}
                  value={row.price}
                  onChange={e => updateRow(i, 'price', e.target.value)}
                  className="h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                />
                <input
                  type="number" placeholder="%"
                  value={row.discount}
                  onChange={e => updateRow(i, 'discount', e.target.value)}
                  className="h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={items.length === 1}
                  className="p-1 rounded text-text-muted hover:text-danger disabled:opacity-30 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t('sales.taxRate')}
            type="number"
            placeholder="0"
            value={taxRate}
            onChange={e => setTaxRate(e.target.value)}
          />
          <Input
            label={t('sales.discountLabel')}
            type="number"
            placeholder="0"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
          />
          <Input
            label={t('sales.dueDate')}
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        {total > 0 && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-1 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>{t('sales.subtotal')}</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {(parseFloat(taxRate) || 0) > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>{t('sales.qqs', { rate: taxRate })}</span>
                <span className="tabular-nums">+{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-border-primary pt-1">
              <span>{t('sales.colTotal')}</span>
              <span className="tabular-nums text-success">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        <Input
          label={t('sales.notesOptional')}
          placeholder="Qo'shimcha ma'lumot..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function SalesInvoicesPage() {
  const t        = useT()
  const navigate = useNavigate()
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const [modal,    setModal]    = useState(false)
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const STATUS_TABS = [
    { key: '',         label: t('common.all') },
    { key: 'DRAFT',    label: t('contracts.draft') },
    { key: 'SENT',     label: t('sales.statusSent') },
    { key: 'PARTIAL',  label: t('sales.statusPartial') },
    { key: 'PAID',     label: t('sales.statusPaid') },
    { key: 'OVERDUE',  label: t('sales.statusOverdue') },
  ]

  const HEADERS = [
    t('sales.colInvoiceNum'), t('sales.colContact'), t('sales.colTotal'),
    t('sales.colPaid'), t('common.status'), t('sales.colDueDate'), '',
  ]

  const query: Record<string, any> = { page, limit: 20 }
  if (status) query.status = status
  if (search) query.search = search

  const { data, isLoading } = useInvoices(query)
  const addPayment  = useAddPayment()
  const bulkDelete  = useBulkDeleteInvoices()

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }, [])
  const selectAll  = useCallback(() => setSelectedIds(new Set(data?.data?.map((i: Invoice) => i.id) ?? [])), [data])
  const clearSelect = useCallback(() => setSelectedIds(new Set()), [])

  const handlePay = async () => {
    if (!payModal || !payAmount) return
    await addPayment.mutateAsync({
      invoiceId: payModal.id,
      amount:    parseFloat(payAmount),
      method:    payMethod,
    })
    setPayModal(null)
    setPayAmount('')
    setPayMethod('CASH')
  }

  return (
    <div>
      <PageHeader
        title={t('sales.invoicesTitle')}
        description={t('sales.invoicesDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.sales'),     path: '/sales' },
          { label: t('sales.invoicesTitle') },
        ]}
        actions={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal(true)}>
            {t('sales.newInvoice')}
          </Button>
        }
      />

      <Card padding="sm" className="mb-4">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('sales.searchInvoice')}
              leftIcon={<Search size={14} />}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                status === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-border-primary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={data?.data?.length ?? 0}
        onSelectAll={selectAll}
        onClearAll={clearSelect}
        actions={[{
          label: "O'chirish",
          icon: <Trash2 size={14} />,
          variant: 'danger' as const,
          onClick: () => {
            if (confirm(`${selectedIds.size} ta invoice o'chirilsinmi?`)) {
              bulkDelete.mutate(Array.from(selectedIds), { onSuccess: clearSelect })
            }
          },
        }]}
      />

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === (data?.data?.length ?? 0)}
                    onChange={e => e.target.checked ? selectAll() : clearSelect()}
                    className="rounded border-border-primary"
                  />
                </th>
                {HEADERS.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-text-muted">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    {t('sales.invoicesNotFound')}
                  </td>
                </tr>
              ) : (
                data.data.map((inv: Invoice) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                    className={cn(
                      'border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group cursor-pointer',
                      selectedIds.has(inv.id) && 'bg-accent-primary/5',
                    )}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(inv.id) }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded border-border-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-accent-primary">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-primary">{inv.contact?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums font-medium text-text-primary">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-sm tabular-nums',
                        inv.paidAmount >= inv.totalAmount ? 'text-success' : 'text-text-secondary',
                      )}>
                        {formatCurrency(inv.paidAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      {inv.dueDate ? (
                        <span className={cn(
                          'text-sm',
                          inv.status !== 'PAID' && new Date(inv.dueDate) < new Date()
                            ? 'text-danger'
                            : 'text-text-secondary',
                        )}>
                          {formatDate(inv.dueDate)}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Download size={12} />}
                          onClick={() => exportInvoicePDF(inv as any)}
                          title="PDF yuklab olish"
                        />
                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => setPayModal(inv)}
                          >
                            {t('sales.pay')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <span className="text-xs text-text-muted">
              {t('sales.paginationInfo', {
                total: data.meta.total,
                page,
                totalPages: data.meta.totalPages,
              })}
            </span>
            <div className="flex gap-1.5">
              <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                {t('sales.prevPage')}
              </Button>
              <Button variant="secondary" size="xs" disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}>
                {t('sales.nextPage')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <NewInvoiceModal open={modal} onClose={() => setModal(false)} />

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={t('sales.addPaymentTitle')}
        description={payModal?.invoiceNumber}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPayModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary" size="sm"
              loading={addPayment.isPending}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              onClick={handlePay}
            >
              {t('sales.pay')}
            </Button>
          </>
        }
      >
        {payModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('sales.totalAmountLabel')}</span>
                <span className="font-medium">{formatCurrency(payModal.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('sales.paidAmountLabel')}</span>
                <span className="font-medium text-success">{formatCurrency(payModal.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border-primary pt-1">
                <span className="text-text-secondary">{t('sales.remainingLabel')}</span>
                <span className="font-semibold text-warning">
                  {formatCurrency(payModal.totalAmount - payModal.paidAmount)}
                </span>
              </div>
            </div>

            <Input
              label={`${t('sales.payAmountLabel')} *`}
              type="number"
              placeholder="0"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                {t('sales.payMethodLabel')}
              </label>
              <select
                value={payMethod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              >
                <option value="CASH">{t('sales.payCash')}</option>
                <option value="CARD">{t('sales.payCard')}</option>
                <option value="TRANSFER">{t('sales.payTransfer')}</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
