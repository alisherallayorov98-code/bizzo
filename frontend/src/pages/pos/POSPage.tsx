import { useState, useRef, useEffect } from 'react'
import { useNavigate }    from 'react-router-dom'
import {
  Search, X, Plus, Minus, Trash2,
  CreditCard, Wallet, TrendingDown, ArrowLeft,
  CheckCircle, Printer, ShoppingCart, User,
  Percent, Camera,
} from 'lucide-react'
import { useMutation }    from '@tanstack/react-query'
import toast              from 'react-hot-toast'
import { usePOSStore }    from '@store/pos.store'
import type { POSItem, PaymentMethod } from '@store/pos.store'
import { useProducts }    from '@features/products/hooks/useProducts'
import { useContacts }    from '@features/contacts/hooks/useContacts'
import { useWarehouses }  from '@features/warehouse/hooks/useWarehouse'
import { api }            from '@config/api'
import { formatCurrency } from '@utils/formatters'
import { generateReceipt, printHTML } from '@utils/printDocument'
import { BarcodeScanner } from '@components/shared/BarcodeScanner/BarcodeScanner'
import { useAuth }        from '@hooks/useAuth'
import { cn }             from '@utils/cn'

// ============================================
// MAHSULOT QIDIRISH
// ============================================
function ProductSearch({ warehouseId, priceLevel }: { warehouseId: string; priceLevel: 'RETAIL' | 'WHOLESALE' | 'VIP' }) {
  const [query,       setQuery]       = useState('')
  const [open,        setOpen]        = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const { addItem }  = usePOSStore()
  const inputRef     = useRef<HTMLInputElement>(null)

  const { data } = useProducts({
    search: query.length >= 1 ? query : undefined,
    limit:  20,
  })

  const products = data?.data || []

  const handleSelect = (product: any) => {
    let price = Number(product.sellPrice) || 0
    if (priceLevel === 'VIP'       && product.vipPrice)       price = Number(product.vipPrice)
    if (priceLevel === 'WHOLESALE' && product.wholesalePrice) price = Number(product.wholesalePrice)

    addItem({
      productId:   product.id,
      productName: product.name,
      productUnit: product.unit || 'dona',
      barcode:     product.barcode,
      quantity:    1,
      price,
    })
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
    toast.success(`${product.name} qo'shildi`, { duration: 1200 })
  }

  const handleBarcodeScan = async (barcode: string) => {
    setScannerOpen(false)
    try {
      const { data: resp } = await api.get(`/products?barcode=${encodeURIComponent(barcode)}&limit=1`)
      const product = resp.data?.data?.[0]
      if (product) {
        handleSelect(product)
        toast.success(`${product.name} topildi ✓`)
      } else {
        toast.error(`"${barcode}" barcode topilmadi`)
        setQuery(barcode)
        setOpen(true)
        inputRef.current?.focus()
      }
    } catch {
      toast.error('Barcode qidirishda xatolik')
    }
  }

  return (
    <>
      <div className="relative flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 h-12 px-4 bg-bg-secondary border-2 border-accent-primary/40 rounded-xl focus-within:border-accent-primary transition-colors">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => query && setOpen(true)}
            placeholder="Mahsulot nomi yoki barcode..."
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted"
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setOpen(false) }} className="text-text-muted hover:text-text-primary">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Kamera tugmasi */}
        <button
          onClick={() => setScannerOpen(true)}
          className="h-12 px-3.5 rounded-xl bg-bg-secondary border-2 border-border-primary text-text-muted hover:text-accent-primary hover:border-accent-primary/40 transition-all"
          title="Barcode skaner"
        >
          <Camera size={18} />
        </button>

        {open && products.length > 0 && (
          <div
            className="absolute top-full left-0 right-12 mt-1 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto"
            onMouseDown={e => e.preventDefault()}
          >
            {products.map((p: any) => {
              const stock = p.stockItems?.reduce(
                (sum: number, s: any) => sum + Number(s.quantity), 0,
              ) || 0

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  disabled={stock <= 0 && !p.isService}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border-primary last:border-0',
                    stock > 0 || p.isService
                      ? 'hover:bg-bg-tertiary'
                      : 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border-primary" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
                      <ShoppingCart size={15} className="text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                    <p className="text-xs text-text-muted">
                      {p.barcode && <span className="font-mono mr-2">{p.barcode}</span>}
                      {!p.isService && (
                        <>Qoldiq: <span className={cn('font-semibold', stock > 0 ? 'text-success' : 'text-danger')}>
                          {stock} {p.unit}
                        </span></>
                      )}
                      {p.isService && <span className="text-info">Xizmat</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text-primary tabular-nums">
                      {formatCurrency(Number(p.sellPrice))}
                    </p>
                    <p className="text-xs text-text-muted">{p.unit}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  )
}

// ============================================
// SAVAT QATORI
// ============================================
function CartRow({ item }: { item: POSItem }) {
  const { updateQty, removeItem } = usePOSStore()

  return (
    <div className="flex items-center gap-2 py-3 border-b border-border-primary last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.productName}</p>
        <p className="text-xs text-text-muted tabular-nums">
          {formatCurrency(item.price)} × {item.quantity} {item.productUnit}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => updateQty(item.productId, item.quantity - 1)}
          className="w-7 h-7 rounded-lg bg-bg-tertiary hover:bg-danger/10 hover:text-danger flex items-center justify-center text-text-muted transition-colors"
        >
          <Minus size={13} />
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={e => updateQty(item.productId, parseFloat(e.target.value) || 0)}
          className="w-14 h-7 rounded-lg bg-bg-tertiary text-center text-sm font-bold text-text-primary outline-none focus:ring-1 focus:ring-accent-primary tabular-nums"
          min={0}
          step={0.1}
        />
        <button
          onClick={() => updateQty(item.productId, item.quantity + 1)}
          className="w-7 h-7 rounded-lg bg-bg-tertiary hover:bg-success/10 hover:text-success flex items-center justify-center text-text-muted transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="w-24 text-right shrink-0">
        <p className="text-sm font-bold text-text-primary tabular-nums">{formatCurrency(item.total)}</p>
      </div>

      <button
        onClick={() => removeItem(item.productId)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ============================================
// MUVAFFAQIYAT EKRANI
// ============================================
function SuccessScreen({
  result,
  onClose,
  onPrint,
}: {
  result:  { total: number; method: string; items: number }
  onClose: () => void
  onPrint: () => void
}) {
  const methodLabels: Record<string, string> = {
    CASH: 'Naqd pul', DEBT: 'Qarzga berildi', CARD: 'Karta orqali', TRANSFER: "O'tkazma",
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-20 h-20 rounded-full bg-success/10 border-4 border-success/20 flex items-center justify-center mb-5">
        <CheckCircle size={40} className="text-success" />
      </div>
      <h2 className="text-2xl font-black text-text-primary mb-2">Sotildi! ✓</h2>
      <p className="text-3xl font-black text-success tabular-nums mb-1">
        {formatCurrency(result.total)}
      </p>
      <p className="text-sm text-text-muted mb-8">
        {methodLabels[result.method] || result.method}
      </p>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-medium"
        >
          <Printer size={16} />
          Chek chop
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-sm transition-colors"
        >
          Yangi sotish
        </button>
      </div>
    </div>
  )
}

// ============================================
// ASOSIY POS SAHIFASI
// ============================================
export default function POSPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    items, contactId, contactName, paymentMethod, discount,
    warehouseId, setContact, setPayment, setDiscount, setWarehouse,
    clear, subtotal, discountAmt, grandTotal,
  } = usePOSStore()

  const [contactSearch,    setContactSearch]    = useState('')
  const [contactDropOpen,  setContactDropOpen]  = useState(false)
  const [result,           setResult]           = useState<{ total: number; method: string; items: number } | null>(null)
  const [discountInput,    setDiscountInput]    = useState('0')
  const [contactPriceLevel, setContactPriceLevel] = useState<'RETAIL' | 'WHOLESALE' | 'VIP'>('RETAIL')

  const { data: contactsData } = useContacts({ search: contactSearch || undefined, limit: 10 })
  const { data: warehouses }   = useWarehouses()

  useEffect(() => {
    if (!warehouseId && warehouses?.length) {
      const def = (warehouses as any[]).find(w => w.isDefault) || warehouses[0]
      if (def) setWarehouse((def as any).id)
    }
  }, [warehouses, warehouseId, setWarehouse])

  useEffect(() => {
    if (!contactId) { setContactPriceLevel('RETAIL'); return }
    api.get(`/contacts/${contactId}`).then(res => {
      const level = (res.data?.data?.priceLevel || 'RETAIL') as 'RETAIL' | 'WHOLESALE' | 'VIP'
      setContactPriceLevel(level)
      if (level !== 'RETAIL') {
        toast.success(
          level === 'VIP' ? 'VIP narxlar qo\'llandi' : 'Ulgurji narxlar qo\'llandi',
          { duration: 1500 },
        )
      }
    }).catch(() => {})
  }, [contactId])

  const sell = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error("Savat bo'sh")
      if (!warehouseId)  throw new Error('Ombor tanlang')

      await api.post('/warehouse/outgoing', {
        contactId:  contactId || undefined,
        createDebt: paymentMethod === 'DEBT' && !!contactId,
        warehouseId,
        notes: `POS sotuv — ${paymentMethod}`,
        lines: items.map(i => ({
          productId: i.productId,
          quantity:  i.quantity,
          price:     i.price,
        })),
      })

      return { total: grandTotal(), method: paymentMethod, items: items.length }
    },
    onSuccess: (data) => {
      setResult(data)
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || e?.message || 'Xatolik')
    },
  })

  const handlePrint = () => {
    if (!result) return
    const html = generateReceipt({
      companyName:   (user as any)?.company?.name || 'BIZZO',
      items:         items.map(i => ({ name: i.productName, qty: i.quantity, unit: i.productUnit, price: i.price, total: i.total })),
      subtotal:      subtotal(),
      discount:      discountAmt() || undefined,
      total:         grandTotal(),
      paymentMethod,
      contactName:   contactName || undefined,
      date:          new Date().toLocaleString('uz-UZ'),
      cashier:       (user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName}` : undefined,
    })
    printHTML(html, 'Chek')
  }

  const handleClose = () => {
    clear()
    setResult(null)
    setDiscountInput('0')
    setContactSearch('')
  }

  const PAYMENT_METHODS = [
    { id: 'CASH'     as PaymentMethod, label: 'Naqd',     icon: Wallet       },
    { id: 'DEBT'     as PaymentMethod, label: 'Qarzga',   icon: TrendingDown },
    { id: 'CARD'     as PaymentMethod, label: 'Karta',    icon: CreditCard   },
    { id: 'TRANSFER' as PaymentMethod, label: "O'tkazma", icon: ArrowLeft    },
  ]

  return (
    <div className="fixed inset-0 bg-bg-primary z-40 flex flex-col">
      {/* HEADER */}
      <div className="h-14 border-b border-border-primary bg-bg-secondary flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-text-primary text-base leading-none">Tezkor sotish</h1>
            <p className="text-[11px] text-text-muted mt-0.5">POS Lite</p>
          </div>
        </div>

        <select
          value={warehouseId}
          onChange={e => setWarehouse(e.target.value)}
          className="h-8 rounded-lg border border-border-primary bg-bg-tertiary text-xs text-text-secondary px-2 focus:outline-none focus:border-accent-primary"
        >
          {(warehouses as any[] | undefined)?.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* KONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* CHAP: Qidiruv + savat */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border-primary">
          <div className="p-4 border-b border-border-primary">
            <ProductSearch warehouseId={warehouseId} priceLevel={contactPriceLevel} />
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <ShoppingCart size={48} className="opacity-10 mb-3" />
                <p className="text-sm">Mahsulot qo'shing</p>
                <p className="text-xs mt-1 opacity-60">Yuqoridagi qidiruvdan tanlang</p>
              </div>
            ) : (
              <div>
                {items.map(item => <CartRow key={item.productId} item={item} />)}
              </div>
            )}
          </div>
        </div>

        {/* O'NG: To'lov paneli */}
        <div className="w-80 xl:w-96 flex flex-col bg-bg-secondary overflow-y-auto">
          {result ? (
            <SuccessScreen result={result} onClose={handleClose} onPrint={handlePrint} />
          ) : (
            <>
              {/* Mijoz */}
              <div className="p-4 border-b border-border-primary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Mijoz</p>
                <div className="relative">
                  <div className="flex items-center gap-2 h-9 px-3 bg-bg-tertiary border border-border-primary rounded-lg">
                    <User size={14} className="text-text-muted shrink-0" />
                    <input
                      value={contactId ? contactName : contactSearch}
                      onChange={e => {
                        setContactSearch(e.target.value)
                        setContactDropOpen(true)
                        if (!e.target.value) setContact('', '')
                      }}
                      placeholder="Mijoz (ixtiyoriy)"
                      className="flex-1 bg-transparent outline-none text-xs text-text-primary placeholder:text-text-muted"
                    />
                    {contactId && (
                      <button onClick={() => { setContact('', ''); setContactSearch('') }} className="text-text-muted hover:text-danger">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {contactDropOpen && contactSearch && !contactId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {(contactsData?.data as any[])?.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setContact(c.id, c.name); setContactDropOpen(false); setContactSearch('') }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-tertiary text-left border-b border-border-primary last:border-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-accent-primary">{c.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-text-primary">{c.name}</p>
                            {c.phone && <p className="text-[10px] text-text-muted">{c.phone}</p>}
                          </div>
                        </button>
                      ))}
                      {!contactsData?.data?.length && (
                        <div className="px-3 py-3 text-xs text-text-muted text-center">Topilmadi</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* To'lov usuli */}
              <div className="p-4 border-b border-border-primary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">To'lov usuli</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPayment(method.id)}
                      disabled={method.id === 'DEBT' && !contactId}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                        paymentMethod === method.id
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-border-primary text-text-secondary hover:border-border-secondary hover:bg-bg-tertiary',
                        method.id === 'DEBT' && !contactId && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      <method.icon size={15} className="shrink-0" />
                      {method.label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'DEBT' && !contactId && (
                  <p className="text-xs text-warning mt-2">⚠️ Qarzga berish uchun mijoz tanlang</p>
                )}
              </div>

              {/* Chegirma */}
              <div className="p-4 border-b border-border-primary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Chegirma</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 h-9 px-3 bg-bg-tertiary border border-border-primary rounded-lg flex-1">
                    <Percent size={13} className="text-text-muted" />
                    <input
                      type="number"
                      value={discountInput}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        setDiscountInput(e.target.value)
                        setDiscount(val)
                      }}
                      min={0} max={100}
                      className="flex-1 bg-transparent outline-none text-sm text-text-primary tabular-nums"
                    />
                  </div>
                  {[5, 10, 15].map(pct => (
                    <button
                      key={pct}
                      onClick={() => { setDiscount(pct); setDiscountInput(String(pct)) }}
                      className={cn(
                        'h-9 px-3 rounded-lg text-xs font-medium transition-colors border',
                        discount === pct
                          ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                          : 'border-border-primary text-text-muted hover:text-text-primary hover:bg-bg-tertiary',
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Hisob-kitob */}
              <div className="p-4 space-y-2 border-b border-border-primary">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Jami ({items.length} ta mahsulot)</span>
                  <span className="text-text-primary tabular-nums">{formatCurrency(subtotal())}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success">Chegirma ({discount}%)</span>
                    <span className="text-success tabular-nums">−{formatCurrency(discountAmt())}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border-primary">
                  <span className="font-bold text-text-primary">To'lov summasi</span>
                  <span className="text-xl font-black text-text-primary tabular-nums">{formatCurrency(grandTotal())}</span>
                </div>
              </div>

              {/* SOTISH TUGMASI */}
              <div className="p-4">
                <button
                  onClick={() => sell.mutate()}
                  disabled={items.length === 0 || sell.isPending}
                  className={cn(
                    'w-full h-14 rounded-2xl font-black text-lg text-white transition-all',
                    'flex items-center justify-center gap-2',
                    items.length > 0 && !sell.isPending
                      ? 'bg-gradient-to-r from-success to-green-500 hover:from-green-500 hover:to-green-400 shadow-lg shadow-success/25 hover:-translate-y-0.5 active:translate-y-0'
                      : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
                  )}
                >
                  {sell.isPending ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={22} />
                      Sotish • {formatCurrency(grandTotal())}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CHOP ETISH */}
      <div className="hidden print:block fixed inset-0 bg-white p-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-black">BIZZO</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleString('uz-UZ')}</p>
        </div>
        <hr className="mb-3" />
        {items.map(item => (
          <div key={item.productId} className="flex justify-between text-sm mb-1">
            <span>{item.productName} × {item.quantity}</span>
            <span className="tabular-nums">{formatCurrency(item.total)}</span>
          </div>
        ))}
        <hr className="my-3" />
        {discount > 0 && (
          <div className="flex justify-between text-sm mb-1">
            <span>Chegirma ({discount}%)</span>
            <span>−{formatCurrency(discountAmt())}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-lg">
          <span>JAMI</span>
          <span className="tabular-nums">{formatCurrency(grandTotal())}</span>
        </div>
        {contactName && <p className="text-sm text-gray-500 mt-2">Mijoz: {contactName}</p>}
        <p className="text-sm text-gray-500">To'lov: {paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'DEBT' ? 'Qarz' : 'Karta'}</p>
        <p className="text-center text-xs text-gray-400 mt-4">Rahmat! • app.bizzo.uz</p>
      </div>
    </div>
  )
}
