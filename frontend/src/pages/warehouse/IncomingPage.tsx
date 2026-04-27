import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ArrowDownToLine, Search,
  AlertTriangle, ChevronDown, Printer, RotateCcw, Sparkles,
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
import api from '@config/api'

interface FrequentProduct {
  productId:   string
  product:     { id: string; name: string; code?: string; unit: string; sellPrice: number; buyPrice: number }
  useCount:    number
  totalQty:    number
  totalAmount: number
  lastPrice:   number | null
  lastQty:     number | null
  lastDate:    string | null
}

interface PriceStats {
  avg: number | null
  min: number | null
  max: number | null
  count: number
}

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
  const location    = useLocation()
  const company     = useAuthStore(s => s.user?.company)

  // /warehouse/restock dan keladigan prefill
  const prefill = (location.state as any)?.prefill as
    | { contactId?: string; warehouseId?: string; lines?: any[] }
    | undefined

  const [warehouseId, setWarehouseId] = useState(prefill?.warehouseId ?? '')
  const [contactId, setContactId]     = useState(prefill?.contactId ?? '')
  const [notes, setNotes]             = useState('')
  const [createDebt, setCreateDebt]   = useState(false)
  const [dueDate, setDueDate]         = useState('')
  const [lines, setLines]             = useState<DocLine[]>(
    prefill?.lines && prefill.lines.length > 0
      ? prefill.lines.map(l => ({
          id:        crypto.randomUUID(),
          productId: l.productId,
          product:   l.product ?? null,
          quantity:  l.quantity ?? 1,
          price:     l.price ?? 0,
        }))
      : [{ id: crypto.randomUUID(), productId: '', product: null, quantity: 1, price: 0 }]
  )

  // Prefill ni state'dan tozalash (sahifani qaytadan ochganda takrorlanmasligi uchun)
  useEffect(() => {
    if (prefill) {
      window.history.replaceState({}, '')
    }
  }, [])

  const { data: warehouses = [] }           = useWarehouses()
  const { data: suppliersResult }           = useContacts({ type: 'SUPPLIER', limit: 100 })
  const suppliers                           = suppliersResult?.data ?? []
  const { data: stockItems = [] }           = useStockOverview(warehouseId || undefined)
  const createIncoming                      = useCreateIncoming()

  // Tanlangan yetkazib beruvchining ko'p ishlatadigan mahsulotlari
  const { data: frequentProducts = [] } = useQuery<FrequentProduct[]>({
    queryKey: ['frequent-products', contactId, 'IN'],
    queryFn: async () => {
      const r = await api.get(`/contacts/${contactId}/frequent-products`, {
        params: { type: 'IN', limit: 12 },
      })
      return r.data.data ?? []
    },
    enabled: !!contactId,
  })

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
    let price = product.buyPrice ?? 0
    let lastInfo: { price: number; date: string } | null = null
    let priceStats: PriceStats | undefined = undefined

    try {
      const res = await api.get(`/products/${product.id}/last-price`, {
        params: { contactId: contactId || undefined, type: 'IN' },
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

  // Frequent product'ni qator sifatida qo'shish (1 bosish bilan)
  const addFromFrequent = useCallback((fp: FrequentProduct) => {
    const newLine: DocLine = {
      id:        crypto.randomUUID(),
      productId: fp.product.id,
      product:   fp.product as any,
      quantity:  fp.lastQty ?? 1,
      price:     fp.lastPrice ?? fp.product.buyPrice,
    }
    setLines(prev => {
      // Agar bo'sh oxirgi qator bo'lsa, uni almashtir
      if (prev.length === 1 && !prev[0].productId) return [newLine]
      return [...prev, newLine]
    })
  }, [])

  // ===== "Oxirgi kirimni takrorlash" =====
  const repeatLast = async () => {
    try {
      const res = await api.get('/warehouse/last-document', {
        params: { type: 'IN', contactId: contactId || undefined },
      })
      const last = res.data.data
      if (!last || !last.lines?.length) {
        toast('Oxirgi kirim topilmadi', { icon: 'ℹ️' })
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
  // Format: "Mahsulot nomi<TAB>Miqdor<TAB>Narx" har bir qator
  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\t') && !text.includes('\n')) return // Oddiy text emas

    const rows = text.trim().split(/\r?\n/).filter(Boolean)
    if (rows.length < 1) return
    e.preventDefault()

    // Birinchi qator headerga o'xshasa — o'tkazib yuborish
    const looksLikeHeader = /[a-z]/i.test(rows[0].split('\t')[1] ?? '')
    const dataRows = looksLikeHeader ? rows.slice(1) : rows

    // Mahsulot nomlari bo'yicha qidiruv
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
            price:     price > 0 ? price : (product.buyPrice ?? 0),
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
    <div className="max-w-4xl space-y-4" onPaste={handlePaste}>
      <PageHeader
        title="Kirim hujjati"
        description="Omborga mahsulot qabul qilish"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Ombor', path: '/warehouse' },
          { label: 'Kirim' },
        ]}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={13} />} onClick={repeatLast}>
            Oxirgi kirimni takrorlash
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

      {/* Tez-tez olib keladigan mahsulotlar */}
      {contactId && frequentProducts.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Bu yetkazuvchidan ko'p olinadigan mahsulotlar</h3>
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
                    {(() => {
                      const stats = line.priceStats
                      let warning: string | null = null
                      if (stats?.avg && stats.count >= 2 && line.price > 0) {
                        const deviation = ((line.price - stats.avg) / stats.avg) * 100
                        if (deviation > 30)        warning = `O'rtachadan ${Math.round(deviation)}% yuqori (avg: ${formatCurrency(stats.avg)})`
                        else if (deviation < -30)  warning = `O'rtachadan ${Math.round(Math.abs(deviation))}% past (avg: ${formatCurrency(stats.avg)})`
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
                            <span className="text-[10px] text-warning mt-0.5 max-w-[200px] text-right" title={warning}>
                              ⚠ {warning.length > 30 ? warning.slice(0, 30) + '…' : warning}
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
