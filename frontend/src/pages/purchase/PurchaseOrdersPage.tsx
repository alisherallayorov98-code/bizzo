import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ShoppingCart, Eye, Trash2, Send, PackageCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',   color: 'bg-gray-500/20 text-gray-300' },
  SENT:      { label: 'Yuborildi',  color: 'bg-blue-500/20 text-blue-300' },
  CONFIRMED: { label: 'Tasdiqlandi',color: 'bg-purple-500/20 text-purple-300' },
  PARTIAL:   { label: 'Qisman',     color: 'bg-yellow-500/20 text-yellow-300' },
  RECEIVED:  { label: 'Qabul qilindi', color: 'bg-green-500/20 text-green-300' },
  CANCELLED: { label: 'Bekor',      color: 'bg-red-500/20 text-red-300' },
}

function useOrders(filters: any) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn:  () => api.get('/purchase/orders', { params: filters }).then(r => r.data),
  })
}

function useSuppliers() {
  return useQuery({
    queryKey: ['contacts-suppliers'],
    queryFn:  () => api.get('/contacts', { params: { type: 'SUPPLIER', limit: 200 } }).then(r => r.data.data ?? r.data),
  })
}

function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn:  () => api.get('/warehouse/warehouses').then(r => r.data),
  })
}

function useProducts() {
  return useQuery({
    queryKey: ['products-all'],
    queryFn:  () => api.get('/products', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

// ── Create/Edit Modal ──────────────────────────────────────────────────────────
interface OrderLine { productId: string; quantity: number; unitPrice: number }

function PurchaseOrderFormModal({ onClose, editOrder }: { onClose: () => void; editOrder?: any }) {
  const qc          = useQueryClient()
  const { data: suppliers  = [] } = useSuppliers()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products   = [] } = useProducts()

  const [supplierId,   setSupplierId]   = useState(editOrder?.supplierId   ?? '')
  const [warehouseId,  setWarehouseId]  = useState(editOrder?.warehouseId  ?? '')
  const [expectedDate, setExpectedDate] = useState(editOrder?.expectedDate ? editOrder.expectedDate.slice(0, 10) : '')
  const [notes,        setNotes]        = useState(editOrder?.notes        ?? '')
  const [lines, setLines] = useState<OrderLine[]>(
    editOrder?.items?.map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) ?? [{ productId: '', quantity: 1, unitPrice: 0 }]
  )

  const mutation = useMutation({
    mutationFn: (body: any) => editOrder
      ? api.patch(`/purchase/orders/${editOrder.id}`, body).then(r => r.data)
      : api.post('/purchase/orders', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(editOrder ? 'Yangilandi' : 'Buyurtma yaratildi')
      onClose()
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })

  const addLine   = () => setLines(l => [...l, { productId: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const setLine   = (i: number, field: keyof OrderLine, val: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || !warehouseId || lines.some(l => !l.productId)) {
      toast.error('Barcha majburiy maydonlarni to\'ldiring')
      return
    }
    mutation.mutate({ supplierId, warehouseId, expectedDate: expectedDate || undefined, notes, items: lines })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form onSubmit={submit} className="bg-[#0D1628] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">{editOrder ? 'Buyurtmani tahrirlash' : 'Yangi xarid buyurtmasi'}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Yetkazib beruvchi *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Tanlang...</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Ombor *</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Tanlang...</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Kutilayotgan sana</label>
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Izoh</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ixtiyoriy..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 font-medium">Mahsulotlar</span>
            <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ Qo'shish</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
              <select value={line.productId} onChange={e => setLine(i, 'productId', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm">
                <option value="">Mahsulot...</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min={0.001} step="any" value={line.quantity}
                onChange={e => setLine(i, 'quantity', Number(e.target.value))}
                placeholder="Miqdor"
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
              <input type="number" min={0} step="any" value={line.unitPrice}
                onChange={e => setLine(i, 'unitPrice', Number(e.target.value))}
                placeholder="Narx"
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
              <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
            </div>
          ))}
          <div className="text-right text-sm text-white font-semibold">
            Jami: {total.toLocaleString()} UZS
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Bekor</button>
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
            {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Receive Modal ──────────────────────────────────────────────────────────────
function ReceiveModal({ order, onClose }: { order: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((i: any) => [i.id, Number(i.quantity) - Number(i.receivedQty)]))
  )
  const [createDebt, setCreateDebt] = useState(false)

  const mutation = useMutation({
    mutationFn: (body: any) => api.post(`/purchase/orders/${order.id}/receive`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Qabul qilindi')
      onClose()
    },
    onError: () => toast.error('Xatolik'),
  })

  const submit = () => {
    const items = order.items
      .filter((i: any) => qtys[i.id] > 0)
      .map((i: any) => ({ itemId: i.id, receivedQty: qtys[i.id] }))
    mutation.mutate({ items, createDebt })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0D1628] border border-white/10 rounded-xl w-full max-w-lg p-6 space-y-4">
        <h3 className="text-white font-semibold">Tovarlarni qabul qilish — #{order.orderNumber}</h3>

        <div className="space-y-2">
          {order.items.map((item: any) => {
            const remaining = Number(item.quantity) - Number(item.receivedQty)
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-gray-200">{item.product?.name}</span>
                <span className="text-xs text-gray-400">Qoldi: {remaining}</span>
                <input type="number" min={0} max={remaining} step="any"
                  value={qtys[item.id] ?? 0}
                  onChange={e => setQtys(q => ({ ...q, [item.id]: Number(e.target.value) }))}
                  className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm" />
              </div>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={createDebt} onChange={e => setCreateDebt(e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          Kreditorlik qarzi (PAYABLE) yaratish
        </label>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Bekor</button>
          <button onClick={submit} disabled={mutation.isPending}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg">
            {mutation.isPending ? '...' : 'Qabul qilish'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const qc = useQueryClient()
  const [showForm,    setShowForm]    = useState(false)
  const [editOrder,   setEditOrder]   = useState<any>(null)
  const [receiveOrder,setReceiveOrder]= useState<any>(null)
  const [statusFilter,setStatusFilter]= useState('')

  const { data, isLoading } = useOrders({ status: statusFilter || undefined })
  const orders = data?.data ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/purchase/orders/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('O\'chirildi') },
  })

  const sendMut = useMutation({
    mutationFn: (id: string) => api.patch(`/purchase/orders/${id}/send`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('Yuborildi') },
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Xarid buyurtmalari</h1>
        </div>
        <button onClick={() => { setEditOrder(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
          <Plus className="w-4 h-4" /> Yangi buyurtma
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', ...Object.keys(STATUS_LABELS)].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}>
            {s === '' ? 'Hammasi' : STATUS_LABELS[s]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['Buyurtma #', 'Yetkazib beruvchi', 'Ombor', 'Sana', 'Jami', 'Holat', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">Yuklanmoqda...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">Buyurtmalar yo'q</td></tr>
            ) : orders.map((o: any) => {
              const st = STATUS_LABELS[o.status] ?? { label: o.status, color: 'bg-gray-500/20 text-gray-300' }
              return (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white text-sm font-mono">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-200 text-sm">{o.supplier?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{o.warehouse?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(o.createdAt).toLocaleDateString('uz')}</td>
                  <td className="px-4 py-3 text-white text-sm">{Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {o.status === 'DRAFT' && (
                        <>
                          <button onClick={() => { setEditOrder(o); setShowForm(true) }}
                            className="p-1.5 text-gray-400 hover:text-blue-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => sendMut.mutate(o.id)}
                            className="p-1.5 text-gray-400 hover:text-purple-400">
                            <Send className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm('O\'chirasizmi?')) deleteMut.mutate(o.id) }}
                            className="p-1.5 text-gray-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {['SENT', 'CONFIRMED', 'PARTIAL'].includes(o.status) && (
                        <button onClick={() => setReceiveOrder(o)}
                          className="p-1.5 text-gray-400 hover:text-green-400">
                          <PackageCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PurchaseOrderFormModal
          editOrder={editOrder}
          onClose={() => { setShowForm(false); setEditOrder(null) }}
        />
      )}
      {receiveOrder && (
        <ReceiveModal order={receiveOrder} onClose={() => setReceiveOrder(null)} />
      )}
    </div>
  )
}
