import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ArrowUpFromLine, Search,
  AlertTriangle, ChevronDown, Sparkles, RotateCcw,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { useWarehouses, useCreateOutgoing, useStockOverview } from '@features/warehouse/hooks/useWarehouse'
import { useContacts } from '@features/contacts/hooks/useContacts'
import { useProducts } from '@features/products/hooks/useProducts'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import type { Product } from '@services/product.service'
import api from '@config/api'

interface FrequentProduct {
  productId:   string
  product:     { id: string; name: string; code?: string; unit: string; sellPrice: number; buyPrice: number }
  useCount:    number
  totalQty:    number
  lastPrice:   number | null
  lastQty:     number | null
  lastDate:    string | null
}

interface PriceStats { avg: number | null; min: number | null; max: number | null; count: number }

// ============================================
// TYPES
// ============================================
interface DocLine {
  id:        string
  productId: string
  product:   Product | null
  quantity:  number
  price:     number
  priceStats?: PriceStats
}

// ============================================
// MAHSULOT QIDIRISH KOMPONENTI
// ============================================
function ProductPicker({
  value,
  onChange,
  stockMap,
}: {
  value:    Product | null
  onChange: (p: Product) => void
  stockMap: Map<string, number>
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')

  const { data: result } = useProducts({
    search:    search || undefined,
    limit:     20,
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
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          avail > 0
                            ? 'bg-success/10 text-success'
                            : 'bg-danger/10 text-danger',
                        )}>
                          {avail > 0 ? `${avail} bor` : 'yo\'q'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
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
export default function OutgoingPage() {
  const navigate = useNavigate()

  const [warehouseId, setWarehouseId] = useState('')
  const [contactId, setContactId]     = useState('')
  const [notes, setNotes]             = useState('')
  const [createDebt, setCreateDebt]   = useState(false)
  const [dueDate, setDueDate]         = useState('')
  const [lines, setLines]             = useState<DocLine[]>([
    { id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 },
  ])

  const { data: warehouses = [] }   = useWarehouses()
  const { data: customersResult }   = useContacts({ type: 'CUSTOMER', limit: 100 })
  const customers                   = customersResult?.data ?? []
  const { data: stockItems = [] }   = useStockOverview(warehouseId || undefined)
  const createOutgoing              = useCreateOutgoing()

  // Tanlangan mijozning ko'p oladigan mahsulotlari
  const { data: frequentProducts = [] } = useQuery<FrequentProduct[]>({
    queryKey: ['frequent-products', contactId, 'OUT'],
    queryFn: async () => {
      const r = await api.get(`/contacts/${contactId}/frequent-products`, {
        params: { type: 'OUT', limit: 12 },
      })
      return r.data.data ?? []
    },
    enabled: !!contactId,
  })

  const stockMap = new Map(stockItems.map(s => [s.productId, s.quantity]))

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

  const handleProductChange = useCallback(async (id: string, product: Product) => {
    let price = product.sellPrice ?? 0
    let lastInfo: { price: number; date: string } | null = null
    let priceStats: PriceStats | undefined = undefined

    try {
      const res = await api.get(`/products/${product.id}/last-price`, {
        params: { contactId: contactId || undefined, type: 'OUT' },
      })
      const data = res.data.data
      if (data?.last?.price > 0) {
        price = data.last.price
        lastInfo = { price: data.last.price, date: data.last.date }
      }
      if (data?.recent) priceStats = data.recent
    } catch {}

    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, productId: product.id, product, price, priceStats } : l,
    ))

    if (lastInfo) {
      toast.success(
        `Oxirgi narx: ${formatCurrency(lastInfo.price)} (${new Date(lastInfo.date).toLocaleDateString('uz-UZ')})`,
        { duration: 2500 },
      )
    }
  }, [contactId])

  const addFromFrequent = useCallback((fp: FrequentProduct) => {
    const newLine: DocLine = {
      id:        crypto.randomUUID(),
      productId: fp.product.id,
      product:   fp.product as any,
      quantity:  fp.lastQty ?? 1,
      price:     fp.lastPrice ?? fp.product.sellPrice,
    }
    setLines(prev => {
      if (prev.length === 1 && !prev[0].productId) return [newLine]
      return [...prev, newLine]
    })
  }, [])

  // ===== "Oxirgi chiqimni takrorlash" =====
  const repeatLast = async () => {
    try {
      const res = await api.get('/warehouse/last-document', {
        params: { type: 'OUT', contactId: contactId || undefined },
      })
      const last = res.data.data
      if (!last || !last.lines?.length) {
        toast('Oxirgi chiqim topilmadi', { icon: 'ℹ️' })
        return
      }
      if (!warehouseId && last.warehouseId) setWarehouseId(last.warehouseId)
      if (!contactId && last.contactId)     setContactId(last.contactId)
      setLines(last.lines.map((l: any) => ({
        id:        crypto.randomUUID(),
        productId: l.productId,
        product:   l.product,
        quantity:  l.quantity,
        price:     l.price,
      })))
      toast.success(`${last.lines.length} ta qator yuklandi (${new Date(last.date).toLocaleDateString('uz-UZ')})`)
    } catch {
      toast.error('Yuklab bo\'lmadi')
    }
  }

  // ===== Excel/Tabdan paste =====
  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\t') && !text.includes('\n')) return

    const rows = text.trim().split(/\r?\n/).filter(Boolean)
    if (rows.length < 1) return
    e.preventDefault()

    const looksLikeHeader = /[a-z]/i.test(rows[0].split('\t')[1] ?? '')
    const dataRows = looksLikeHeader ? rows.slice(1) : rows

    const newLines: DocLine[] = []
    let notFound = 0

    for (const row of dataRows) {
      const cols = row.split('\t').map(c => c.trim())
      if (cols.length < 2) continue
      const [name, qtyStr, priceStr] = cols
      const qty   = parseFloat((qtyStr   ?? '1').replace(/[^\d.,-]/g, '').replace(',', '.')) || 1
      const price = parseFloat((priceStr ?? '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0

      try {
        const r = await api.get('/products', { params: { search: name, limit: 1 } })
        const product = r.data.data?.data?.[0]
        if (product) {
          newLines.push({
            id:        crypto.randomUUID(),
            productId: product.id,
            product,
            quantity:  qty,
            price:     price > 0 ? price : (product.sellPrice ?? 0),
          })
        } else {
          notFound++
        }
      } catch { notFound++ }
    }

    if (newLines.length > 0) {
      setLines(prev => {
        if (prev.length === 1 && !prev[0].productId) return newLines
        return [...prev, ...newLines]
      })
      toast.success(
        `${newLines.length} ta qator qo'shildi${notFound > 0 ? ` · ${notFound} ta topilmadi` : ''}`,
      )
    } else {
      toast.error('Hech qanday mahsulot topilmadi')
    }
  }

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.price, 0)

  const stockWarnings = lines.filter(l => {
    if (!l.productId || !warehouseId) return false
    const avail = stockMap.get(l.productId) ?? 0
    return l.quantity > avail
  })

  const canSubmit = (
    warehouseId &&
    lines.every(l => l.productId && l.quantity > 0 && l.price >= 0) &&
    stockWarnings.length === 0
  )

  const handleSubmit = async () => {
    if (!canSubmit) return
    await createOutgoing.mutateAsync({
      warehouseId,
      contactId:  contactId || undefined,
      lines:      lines.map(l => ({ productId: l.productId, quantity: l.quantity, price: l.price })),
      notes:      notes || undefined,
      createDebt: createDebt && !!contactId,
      dueDate:    dueDate || undefined,
    })
    navigate('/warehouse/movements')
  }

  return (
    <div className="max-w-4xl space-y-4" onPaste={handlePaste}>
      <PageHeader
        title="Chiqim hujjati"
        description="Ombordan mahsulot chiqarish"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Ombor', path: '/warehouse' },
          { label: 'Chiqim' },
        ]}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={13} />} onClick={repeatLast}>
            Oxirgi chiqimni takrorlash
          </Button>
        }
      />

      {/* Asosiy ma'lumotlar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ombor */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Ombor *</label>
            <select
              value={warehouseId}
              onChange={e => { setWarehouseId(e.target.value) }}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">Ombor tanlang...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Mijoz */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Mijoz</label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">Tanlang (ixtiyoriy)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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

      {/* Tez-tez sotib oladigan mahsulotlar */}
      {contactId && frequentProducts.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Bu mijoz ko'p oladigan mahsulotlar</h3>
            <span className="text-xs text-text-muted">— bir bosish bilan qo'shish</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {frequentProducts.map(fp => (
              <button
                key={fp.productId}
                type="button"
                onClick={() => addFromFrequent(fp)}
                className="group flex flex-col items-start gap-1 p-3 rounded-lg border border-border-primary bg-bg-secondary hover:bg-accent-primary/5 hover:border-accent-primary/40 transition-all text-left"
              >
                <p className="text-sm font-medium text-text-primary truncate w-full">{fp.product.name}</p>
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="text-text-muted">{fp.useCount} marta</span>
                  {fp.lastPrice !== null && (
                    <span className="font-semibold text-accent-primary tabular-nums">{formatCurrency(fp.lastPrice)}</span>
                  )}
                </div>
                {fp.lastDate && (
                  <span className="text-[10px] text-text-muted">
                    Oxirgi: {new Date(fp.lastDate).toLocaleDateString('uz-UZ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Mahsulotlar jadvali */}
      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Mahsulotlar</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              💡 Excel'dan jadval ko'chirib, Ctrl+V bossangiz qatorlar avtomatik qo'shiladi
            </p>
          </div>
          <Button variant="secondary" size="xs" leftIcon={<Plus size={13} />} onClick={addLine}>
            Qator qo'shish
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Mahsulot', 'Qoldiq', 'Miqdor', 'Narx', 'Jami', ''].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      i >= 1 && i <= 4 ? 'text-right' : 'text-left',
                      i === 0 ? 'min-w-[220px]' : '',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const avail   = line.productId ? (stockMap.get(line.productId) ?? 0) : null
                const isLow   = avail !== null && line.quantity > avail
                return (
                  <tr
                    key={line.id}
                    className={cn(
                      'border-b border-border-primary last:border-0',
                      isLow && 'bg-danger/5',
                    )}
                  >
                    <td className="px-4 py-2 min-w-[220px]">
                      <ProductPicker
                        value={line.product}
                        onChange={p => handleProductChange(line.id, p)}
                        stockMap={stockMap}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {avail !== null ? (
                        <span className={cn(
                          'text-sm tabular-nums font-medium',
                          avail === 0 ? 'text-danger' : avail < line.quantity ? 'text-warning' : 'text-success',
                        )}>
                          {avail} {line.product?.unit ?? ''}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.quantity}
                        onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className={cn(
                          'w-24 px-2 py-1.5 rounded-lg border bg-bg-secondary text-sm text-right text-text-primary focus:outline-none focus:ring-1 tabular-nums',
                          isLow
                            ? 'border-danger/50 focus:ring-danger'
                            : 'border-border-primary focus:ring-accent-primary',
                        )}
                      />
                      {line.product && (
                        <span className="ml-1 text-xs text-text-muted">{line.product.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {(() => {
                        const stats = line.priceStats
                        let warning: string | null = null
                        if (stats?.avg && stats.count >= 2 && line.price > 0) {
                          const deviation = ((line.price - stats.avg) / stats.avg) * 100
                          if (deviation > 30)        warning = `O'rtachadan ${Math.round(deviation)}% yuqori`
                          else if (deviation < -30)  warning = `O'rtachadan ${Math.round(Math.abs(deviation))}% past`
                        }
                        return (
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.price}
                              onChange={e => updateLine(line.id, { price: parseFloat(e.target.value) || 0 })}
                              className={cn(
                                'w-32 px-2 py-1.5 rounded-lg border bg-bg-secondary text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary tabular-nums',
                                warning ? 'border-warning' : 'border-border-primary',
                              )}
                            />
                            {warning && (
                              <span className="text-[10px] text-warning mt-0.5" title={warning}>
                                ⚠ {warning}
                              </span>
                            )}
                          </div>
                        )
                      })()}
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
                  Debitor qarz yaratish
                </p>
                <p className="text-xs text-text-muted">
                  Mijozdan {formatCurrency(totalAmount)} miqdorda RECEIVABLE qarz yoziladi
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

      {/* Ogohlantirish: yetarli qoldiq yo'q */}
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
          leftIcon={<ArrowUpFromLine size={15} />}
          onClick={handleSubmit}
          loading={createOutgoing.isPending}
          disabled={!canSubmit}
        >
          Chiqimni saqlash
        </Button>
        <Button variant="secondary" onClick={() => navigate('/warehouse/movements')}>
          Bekor qilish
        </Button>
      </div>
    </div>
  )
}
