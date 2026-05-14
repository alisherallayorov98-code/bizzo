import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, RotateCcw, Search, ChevronDown,
  CheckCircle, Printer, FileText, AlertTriangle,
} from 'lucide-react'
import { PageHeader }   from '@components/layout/PageHeader/PageHeader'
import { Button }       from '@components/ui/Button/Button'
import { Card }         from '@components/ui/Card/Card'
import { useWarehouses, useCreateReturn, useStockOverview } from '@features/warehouse/hooks/useWarehouse'
import { useContacts }  from '@features/contacts/hooks/useContacts'
import { useProducts }  from '@features/products/hooks/useProducts'
import { formatCurrency } from '@utils/formatters'
import { cn }           from '@utils/cn'
import type { Product } from '@services/product.service'
import type { DocumentResult } from '@services/warehouse.service'
import { generateReceipt, generateNakladnaya, printHTML } from '@utils/printDocument'
import { useAuth }      from '@hooks/useAuth'

type ReturnType = 'RETURN_IN' | 'RETURN_OUT'

interface DocLine {
  id:        string
  productId: string
  product:   Product | null
  quantity:  number
  price:     number
}

interface ReturnResult {
  docResult:   DocumentResult
  lines:       DocLine[]
  contactName: string
  totalAmount: number
  returnType:  ReturnType
  notes:       string
}

// ============================================
// MAHSULOT PICKER
// ============================================
function ProductPicker({
  value, onChange, stockMap, returnType,
}: {
  value:      Product | null
  onChange:   (p: Product) => void
  stockMap:   Map<string, number>
  returnType: ReturnType
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')

  const { data: result } = useProducts({ search: search || undefined, limit: 20 })
  const products = result?.data ?? []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-left hover:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>
          {value ? value.name : 'Mahsulot tanlang...'}
        </span>
        <ChevronDown size={14} className="text-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-bg-elevated border border-border-primary rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border-primary">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-secondary border border-border-primary">
              <Search size={13} className="text-text-muted shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {products.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted text-center">Topilmadi</p>
            ) : (
              products.map(p => {
                const avail = stockMap.get(p.id) ?? 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange(p); setOpen(false); setSearch('') }}
                    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-text-muted">{p.unit} · {formatCurrency(p.sellPrice)}</p>
                        {returnType === 'RETURN_OUT' && (
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            avail > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                          )}>
                            {avail > 0 ? `${avail} bor` : "yo'q"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ReturnPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [returnType,  setReturnType]  = useState<ReturnType>('RETURN_IN')
  const [warehouseId, setWarehouseId] = useState('')
  const [contactId,   setContactId]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [refundDebt,  setRefundDebt]  = useState(false)
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null)
  const [lines, setLines] = useState<DocLine[]>([
    { id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 },
  ])

  const { data: warehouses = [] }  = useWarehouses()
  const { data: contactsResult }   = useContacts({ limit: 100 })
  const contacts                   = contactsResult?.data ?? []
  const { data: stockItems = [] }  = useStockOverview(warehouseId || undefined)
  const createReturn               = useCreateReturn()

  const stockMap     = new Map(stockItems.map(s => [s.productId, s.quantity]))
  const selectedContact = contacts.find(c => c.id === contactId)

  const addLine = useCallback(() => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 }])
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<DocLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.price, 0)

  // RETURN_OUT uchun qoldiq yetarliligini tekshirish
  const stockWarnings = returnType === 'RETURN_OUT'
    ? lines.filter(l => {
        if (!l.productId || !warehouseId) return false
        return l.quantity > (stockMap.get(l.productId) ?? 0)
      })
    : []

  const canSubmit = (
    warehouseId &&
    lines.every(l => l.productId && l.quantity > 0 && l.price >= 0) &&
    stockWarnings.length === 0
  )

  const handleSubmit = async () => {
    if (!canSubmit) return
    const docResult = await createReturn.mutateAsync({
      type:        returnType,
      warehouseId,
      contactId:   contactId || undefined,
      lines:       lines.map(l => ({ productId: l.productId, quantity: l.quantity, price: l.price })),
      notes:       notes || undefined,
      refundDebt:  refundDebt && !!contactId,
    })
    setReturnResult({
      docResult,
      lines:       [...lines],
      contactName: selectedContact?.name ?? '',
      totalAmount: docResult.totalAmount,
      returnType,
      notes,
    })
  }

  const receiptNumber = returnResult
    ? `RET-${returnResult.docResult.movements[0]?.id?.slice(-6).toUpperCase() ?? '------'}`
    : ''

  const handlePrintReceipt = () => {
    if (!returnResult) return
    const html = generateReceipt({
      companyName:    (user as any)?.company?.name ?? 'BIZZO',
      companyPhone:   (user as any)?.company?.phone ?? undefined,
      companyAddress: (user as any)?.company?.address ?? undefined,
      items: returnResult.lines.map(l => ({
        name:  l.product?.name ?? l.productId,
        qty:   l.quantity,
        unit:  l.product?.unit ?? 'dona',
        price: l.price,
        total: l.quantity * l.price,
      })),
      subtotal:       returnResult.totalAmount,
      total:          returnResult.totalAmount,
      paymentMethod:  returnResult.returnType === 'RETURN_IN' ? 'CASH' : 'TRANSFER',
      contactName:    returnResult.contactName || undefined,
      date:           new Date().toLocaleString('uz-UZ'),
      cashier:        (user as any)?.firstName
                        ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
                        : undefined,
      receiptNumber,
      saleType:       returnResult.returnType === 'RETURN_IN' ? 'CHAKANA' : 'ULGURJI',
    })
    printHTML(html, `Qaytarish cheki ${receiptNumber}`)
  }

  const handlePrintNakladnaya = () => {
    if (!returnResult) return
    const html = generateNakladnaya({
      type:      returnResult.returnType === 'RETURN_IN' ? 'IN' : 'OUT',
      docNumber: receiptNumber,
      date:      new Date().toLocaleString('uz-UZ'),
      company: {
        name:    (user as any)?.company?.name ?? 'BIZZO',
        stir:    (user as any)?.company?.stir ?? undefined,
        address: (user as any)?.company?.address ?? undefined,
      },
      contact: returnResult.contactName ? { name: returnResult.contactName } : undefined,
      items: returnResult.lines.map(l => ({
        name:  l.product?.name ?? l.productId,
        unit:  l.product?.unit ?? 'dona',
        qty:   l.quantity,
        price: l.price,
        total: l.quantity * l.price,
      })),
      total: returnResult.totalAmount,
      notes: returnResult.notes || `Qaytarish hujjati — ${returnResult.returnType === 'RETURN_IN' ? 'xaridordan' : 'yetkazib beruvchiga'}`,
    })
    printHTML(html, `Qaytarish nakladnaya ${receiptNumber}`)
  }

  const handleNew = () => {
    setReturnResult(null)
    setLines([{ id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 }])
    setNotes('')
    setRefundDebt(false)
  }

  // ─── SUCCESS SCREEN ────────────────────────────────────────
  if (returnResult) {
    const typeLabel = returnResult.returnType === 'RETURN_IN' ? 'Xaridordan qaytarildi' : 'Yetkazib beruvchiga qaytarildi'
    return (
      <div className="max-w-lg mx-auto mt-12 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-success/10 border-4 border-success/20 flex items-center justify-center">
          <CheckCircle size={40} className="text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-text-primary">Saqlandi!</h2>
          <p className="text-sm text-text-muted mt-1">{receiptNumber} · {typeLabel}</p>
          <p className="text-xl font-bold text-text-primary tabular-nums mt-1">
            {formatCurrency(returnResult.totalAmount)}
          </p>
          {returnResult.contactName && (
            <p className="text-sm text-text-secondary mt-0.5">Kontakt: {returnResult.contactName}</p>
          )}
          {returnResult.docResult.debtNote && (
            <p className="text-xs text-warning mt-1">
              Qarz yozuvi yaratildi: {formatCurrency(returnResult.totalAmount)}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors text-sm font-medium"
          >
            <Printer size={16} /> Chek (58mm)
          </button>
          <button
            onClick={handlePrintNakladnaya}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors text-sm font-medium"
          >
            <FileText size={16} /> Nakladnaya
          </button>
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={handleNew}
            className="flex-1 py-3 rounded-xl bg-accent-primary hover:opacity-90 text-white font-semibold text-sm transition-opacity"
          >
            Yangi qaytarish
          </button>
          <button
            onClick={() => navigate('/warehouse/movements')}
            className="flex-1 py-3 rounded-xl border border-border-primary text-text-secondary hover:bg-bg-secondary transition-colors text-sm font-medium"
          >
            Jurnalga o'tish
          </button>
        </div>
      </div>
    )
  }

  // ─── FORM ──────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Tovar qaytarish"
        description="Xaridordan yoki yetkazib beruvchiga tovar qaytarish"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Ombor', path: '/warehouse' },
          { label: 'Qaytarish' },
        ]}
      />

      {/* Qaytarish turi */}
      <Card>
        <p className="text-sm font-semibold text-text-secondary mb-3">Qaytarish turi</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setReturnType('RETURN_IN')}
            className={cn(
              'flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all',
              returnType === 'RETURN_IN'
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-border-primary hover:border-border-secondary',
            )}
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={16} className={returnType === 'RETURN_IN' ? 'text-accent-primary' : 'text-text-muted'} />
              <span className={cn('text-sm font-semibold', returnType === 'RETURN_IN' ? 'text-accent-primary' : 'text-text-primary')}>
                Xaridordan qaytish
              </span>
            </div>
            <p className="text-xs text-text-muted pl-6">
              Mijoz mahsulotni qaytaradi → ombor qoldig'i oshadi
            </p>
          </button>
          <button
            type="button"
            onClick={() => setReturnType('RETURN_OUT')}
            className={cn(
              'flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all',
              returnType === 'RETURN_OUT'
                ? 'border-warning bg-warning/5'
                : 'border-border-primary hover:border-border-secondary',
            )}
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={16} className={returnType === 'RETURN_OUT' ? 'text-warning' : 'text-text-muted'} />
              <span className={cn('text-sm font-semibold', returnType === 'RETURN_OUT' ? 'text-warning' : 'text-text-primary')}>
                Yetkazib beruvchiga
              </span>
            </div>
            <p className="text-xs text-text-muted pl-6">
              Biz yetkazib beruvchiga qaytaramiz → ombor qoldig'i kamayadi
            </p>
          </button>
        </div>
      </Card>

      {/* Asosiy ma'lumotlar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Ombor *</label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">Ombor tanlang...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {returnType === 'RETURN_IN' ? 'Xaridor' : 'Yetkazib beruvchi'}
            </label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">Tanlang (ixtiyoriy)</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Izoh</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Qaytarish sababi..."
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
        </div>
      </Card>

      {/* Mahsulotlar jadvali */}
      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h3 className="text-sm font-semibold text-text-primary">Mahsulotlar</h3>
          <Button variant="secondary" size="xs" leftIcon={<Plus size={13} />} onClick={addLine}>
            Qator qo'shish
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border-primary">
                {['Mahsulot', returnType === 'RETURN_OUT' ? 'Qoldiq' : '', 'Miqdor', 'Narx', 'Jami', ''].map((h, i) => (
                  <th key={i} className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                    i >= 2 && i <= 4 ? 'text-right' : 'text-left',
                    i === 0 ? 'min-w-[200px]' : '',
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const avail = line.productId ? (stockMap.get(line.productId) ?? 0) : null
                const isLow = returnType === 'RETURN_OUT' && avail !== null && line.quantity > avail
                return (
                  <tr key={line.id} className={cn('border-b border-border-primary last:border-0', isLow && 'bg-danger/5')}>
                    <td className="px-4 py-2 min-w-[200px]">
                      <ProductPicker
                        value={line.product}
                        onChange={p => updateLine(line.id, { productId: p.id, product: p, price: p.sellPrice ?? 0 })}
                        stockMap={stockMap}
                        returnType={returnType}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {returnType === 'RETURN_OUT' && avail !== null ? (
                        <span className={cn('text-sm tabular-nums font-medium',
                          avail === 0 ? 'text-danger' : avail < line.quantity ? 'text-warning' : 'text-success',
                        )}>
                          {avail} {line.product?.unit ?? ''}
                        </span>
                      ) : <span className="text-sm text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number" min="0.001" step="0.001"
                        value={line.quantity}
                        onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className={cn(
                          'w-24 px-2 py-1.5 rounded-lg border bg-bg-secondary text-sm text-right text-text-primary focus:outline-none focus:ring-1 tabular-nums',
                          isLow ? 'border-danger/50 focus:ring-danger' : 'border-border-primary focus:ring-accent-primary',
                        )}
                      />
                      {line.product && <span className="ml-1 text-xs text-text-muted">{line.product.unit}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number" min="0" step="1"
                        value={line.price}
                        onChange={e => updateLine(line.id, { price: parseFloat(e.target.value) || 0 })}
                        className="w-32 px-2 py-1.5 rounded-lg border border-border-primary bg-bg-secondary text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-sm font-medium tabular-nums text-text-primary">
                        {formatCurrency(line.quantity * line.price)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => lines.length > 1 && removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 p-4 border-t border-border-primary bg-bg-tertiary/40">
          <span className="text-sm text-text-muted">Jami:</span>
          <span className="text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </Card>

      {/* Qarz yozuvi */}
      {contactId && (
        <Card>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={refundDebt}
              onChange={e => setRefundDebt(e.target.checked)}
              className="w-4 h-4 rounded border-border-primary accent-accent-primary"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Qarz yozuvi yaratish
              </p>
              <p className="text-xs text-text-muted">
                {returnType === 'RETURN_IN'
                  ? `Mijozga ${formatCurrency(totalAmount)} miqdorda PAYABLE qarz yoziladi (qaytarish puli)`
                  : `Yetkazib beruvchidan ${formatCurrency(totalAmount)} miqdorda RECEIVABLE qarz yoziladi`}
              </p>
            </div>
          </label>
        </Card>
      )}

      {/* Ogohlantirish */}
      {stockWarnings.length > 0 && (
        <div className="p-3 rounded-xl border border-danger/30 bg-danger/5 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-danger" />
            <p className="text-sm font-medium text-danger">Yetarli qoldiq yo'q:</p>
          </div>
          {stockWarnings.map(l => (
            <p key={l.id} className="text-xs text-danger pl-5">
              {l.product?.name ?? l.productId}: so'ralgan {l.quantity},
              mavjud {stockMap.get(l.productId) ?? 0} {l.product?.unit ?? ''}
            </p>
          ))}
        </div>
      )}

      {/* Tugmalar */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          leftIcon={<RotateCcw size={15} />}
          onClick={handleSubmit}
          loading={createReturn.isPending}
          disabled={!canSubmit}
        >
          Qaytarishni saqlash
        </Button>
        <Button variant="secondary" onClick={() => navigate('/warehouse/movements')}>
          Bekor qilish
        </Button>
      </div>
    </div>
  )
}
