import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, ArrowDownToLine, Search,
  AlertTriangle, ChevronDown, Printer,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { useWarehouses, useCreateIncoming } from '@features/warehouse/hooks/useWarehouse'
import { useContacts } from '@features/contacts/hooks/useContacts'
import { useProducts } from '@features/products/hooks/useProducts'
import { useStockOverview } from '@features/warehouse/hooks/useWarehouse'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import type { Product } from '@services/product.service'
import { printHTML, generateNakladnaya } from '@utils/printDocument'
import { useAuthStore } from '@store/auth.store'

// ============================================
// TYPES
// ============================================
interface DocLine {
  id:        string
  productId: string
  product:   Product | null
  quantity:  number
  price:     number
}

// ============================================
// MAHSULOT QIDIRISH KOMPONENTI
// ============================================
function ProductPicker({
  value,
  onChange,
}: {
  value:    Product | null
  onChange: (p: Product) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')

  const { data: result } = useProducts({
    search:  search || undefined,
    limit:   20,
    isService: false,
  })
  const products = result?.data ?? []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
          'border-border-primary bg-bg-secondary text-left',
          'hover:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary',
        )}
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
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {products.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-muted text-center">Mahsulot topilmadi</p>
            ) : (
              products.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p); setOpen(false); setSearch('') }}
                  className="w-full flex items-start gap-2 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                    <p className="text-xs text-text-muted">{p.unit} · {formatCurrency(p.buyPrice)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function IncomingPage() {
  const navigate    = useNavigate()
  const company     = useAuthStore(s => s.user?.company)

  const [warehouseId, setWarehouseId] = useState('')
  const [contactId, setContactId]     = useState('')
  const [notes, setNotes]             = useState('')
  const [createDebt, setCreateDebt]   = useState(false)
  const [dueDate, setDueDate]         = useState('')
  const [lines, setLines]             = useState<DocLine[]>([
    { id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 },
  ])

  const { data: warehouses = [] }           = useWarehouses()
  const { data: suppliersResult }           = useContacts({ type: 'SUPPLIER', limit: 100 })
  const suppliers                           = suppliersResult?.data ?? []
  const { data: stockItems = [] }           = useStockOverview(warehouseId || undefined)
  const createIncoming                      = useCreateIncoming()

  const addLine = useCallback(() => {
    setLines(prev => [
      ...prev,
      { id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 },
    ])
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<DocLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  const handleProductChange = useCallback((id: string, product: Product) => {
    setLines(prev => prev.map(l =>
      l.id === id
        ? { ...l, productId: product.id, product, price: product.buyPrice ?? 0 }
        : l,
    ))
  }, [])

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.price, 0)

  const canSubmit = warehouseId && lines.every(l => l.productId && l.quantity > 0 && l.price >= 0)

  const buildPayload = () => ({
    warehouseId,
    contactId:  contactId || undefined,
    lines:      lines.map(l => ({ productId: l.productId, quantity: l.quantity, price: l.price })),
    notes:      notes || undefined,
    createDebt: createDebt && !!contactId,
    dueDate:    dueDate || undefined,
  })

  const handleSubmit = async () => {
    if (!canSubmit) return
    await createIncoming.mutateAsync(buildPayload())
    navigate('/warehouse/movements')
  }

  const handleSubmitAndPrint = async () => {
    if (!canSubmit) return
    const result = await createIncoming.mutateAsync(buildPayload())
    const docNumber = ((result as any)?.movements?.[0]?.id ?? '').slice(-8).toUpperCase() || 'KIRIM'
    const contact   = suppliers.find(s => s.id === contactId)
    const html = generateNakladnaya({
      type:      'IN',
      docNumber,
      date:      new Date().toLocaleString('uz-UZ'),
      company:   { name: company?.name ?? 'BIZZO' },
      contact:   contact ? { name: contact.name } : undefined,
      items:     lines
        .filter(l => l.product)
        .map(l => ({
          name:  l.product!.name,
          unit:  l.product!.unit ?? 'dona',
          qty:   l.quantity,
          price: l.price,
          total: l.quantity * l.price,
        })),
      total:     totalAmount,
      notes:     notes || undefined,
    })
    printHTML(html, `Kirim — ${docNumber}`)
    navigate('/warehouse/movements')
  }

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Kirim hujjati"
        description="Omborga mahsulot qabul qilish"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Ombor', path: '/warehouse' },
          { label: 'Kirim' },
        ]}
      />

      {/* Asosiy ma'lumotlar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ombor */}
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

          {/* Yetkazuvchi */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Yetkazuvchi</label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">Tanlang (ixtiyoriy)</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Izoh */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-text-secondary">Izoh</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ixtiyoriy izoh..."
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Mahsulot', 'Miqdor', 'Narx', 'Jami', ''].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      i >= 1 && i <= 3 ? 'text-right' : 'text-left',
                      i === 0 ? 'min-w-[220px]' : '',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-border-primary last:border-0">
                  <td className="px-4 py-2 min-w-[220px]">
                    <ProductPicker
                      value={line.product}
                      onChange={p => handleProductChange(line.id, p)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 rounded-lg border border-border-primary bg-bg-secondary text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary tabular-nums"
                    />
                    {line.product && (
                      <span className="ml-1 text-xs text-text-muted">{line.product.unit}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Jami */}
        <div className="flex items-center justify-end gap-4 p-4 border-t border-border-primary bg-bg-tertiary/40">
          <span className="text-sm text-text-muted">Jami:</span>
          <span className="text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </Card>

      {/* Qarz yaratish */}
      {contactId && (
        <Card>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createDebt}
                onChange={e => setCreateDebt(e.target.checked)}
                className="w-4 h-4 rounded border-border-primary accent-accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Kreditor qarz yaratish
                </p>
                <p className="text-xs text-text-muted">
                  Yetkazuvchiga {formatCurrency(totalAmount)} miqdorda PAYABLE qarz yoziladi
                </p>
              </div>
            </label>

            {createDebt && (
              <div className="space-y-1.5 pl-7">
                <label className="text-sm font-medium text-text-secondary">To'lov muddati</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tugmalar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          leftIcon={<ArrowDownToLine size={15} />}
          onClick={handleSubmit}
          loading={createIncoming.isPending}
          disabled={!canSubmit}
        >
          Kirimni saqlash
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Printer size={15} />}
          onClick={handleSubmitAndPrint}
          loading={createIncoming.isPending}
          disabled={!canSubmit}
        >
          Saqlash va chop etish
        </Button>
        <Button variant="secondary" onClick={() => navigate('/warehouse/movements')}>
          Bekor qilish
        </Button>
      </div>

      {!canSubmit && lines.some(l => !l.productId) && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-warning/30 bg-warning/5">
          <AlertTriangle size={14} className="text-warning" />
          <p className="text-xs text-warning">Barcha qatorlarda mahsulot tanlang</p>
        </div>
      )}
    </div>
  )
}
