import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeftRight, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',    color: 'bg-gray-500/20 text-gray-300' },
  COMPLETED: { label: 'Bajarildi',   color: 'bg-green-500/20 text-green-300' },
  CANCELLED: { label: 'Bekor',       color: 'bg-red-500/20 text-red-300' },
}

function useTransfers(filters: any) {
  return useQuery({
    queryKey: ['stock-transfers', filters],
    queryFn:  () => api.get('/warehouse/transfers', { params: filters }).then(r => r.data),
  })
}

function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn:  () => api.get('/warehouse/warehouses').then(r => r.data),
  })
}

function useStockItems(warehouseId: string) {
  return useQuery({
    queryKey: ['stock-items', warehouseId],
    queryFn:  () => api.get('/warehouse/overview', { params: { warehouseId } }).then(r => r.data),
    enabled:  !!warehouseId,
  })
}

function useProducts() {
  return useQuery({
    queryKey: ['products-all'],
    queryFn:  () => api.get('/products', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

// ── Form Modal ──────────────────────────────────────────────────────────────
interface TransferLine { productId: string; quantity: number; stock?: number }

function StockTransferFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products   = [] } = useProducts()

  const [fromId, setFromId] = useState('')
  const [toId,   setToId]   = useState('')
  const [notes,  setNotes]  = useState('')
  const [lines,  setLines]  = useState<TransferLine[]>([{ productId: '', quantity: 1 }])

  const { data: stockData } = useStockItems(fromId)
  const stockMap: Record<string, number> = {}
  if (stockData?.items) {
    stockData.items.forEach((s: any) => { stockMap[s.productId] = Number(s.quantity) })
  }

  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/warehouse/transfers', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      toast.success('O\'tkazma yaratildi')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const addLine    = () => setLines(l => [...l, { productId: '', quantity: 1 }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const setLine    = (i: number, field: keyof TransferLine, val: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromId || !toId) { toast.error('Ombor tanlang'); return }
    if (fromId === toId)  { toast.error('Manba va manzil bir xil bo\'lishi mumkin emas'); return }
    if (lines.some(l => !l.productId || l.quantity <= 0)) {
      toast.error('Barcha qatorlarni to\'ldiring'); return
    }
    mutation.mutate({ fromWarehouseId: fromId, toWarehouseId: toId, notes, items: lines.map(l => ({ productId: l.productId, quantity: l.quantity })) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form onSubmit={submit} className="bg-[#0D1628] border border-white/10 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Yangi ombor o'tkazmasi</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Manba ombor *</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Tanlang...</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Manzil ombor *</label>
            <select value={toId} onChange={e => setToId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Tanlang...</option>
              {(warehouses as any[]).filter((w: any) => w.id !== fromId).map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Izoh</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ixtiyoriy..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 font-medium">Mahsulotlar</span>
            <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ Qo'shish</button>
          </div>
          {lines.map((line, i) => {
            const avail = stockMap[line.productId]
            return (
              <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                <select value={line.productId} onChange={e => setLine(i, 'productId', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm">
                  <option value="">Mahsulot...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative">
                  <input type="number" min={0.001} step="any" max={avail}
                    value={line.quantity}
                    onChange={e => setLine(i, 'quantity', Number(e.target.value))}
                    placeholder="Miqdor"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm" />
                  {avail !== undefined && (
                    <span className="absolute -top-4 right-0 text-xs text-gray-500">maks: {avail}</span>
                  )}
                </div>
                <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
              </div>
            )
          })}
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StockTransferPage() {
  const qc = useQueryClient()
  const [showForm,    setShowForm]    = useState(false)
  const [statusFilter,setStatusFilter]= useState('')

  const { data, isLoading } = useTransfers({ status: statusFilter || undefined })
  const transfers = data?.data ?? []

  const confirmMut = useMutation({
    mutationFn: (id: string) => api.post(`/warehouse/transfers/${id}/confirm`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Tasdiqlandi, stok yangilandi') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/warehouse/transfers/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('O\'chirildi') },
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Ombor o'tkazmalari</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
          <Plus className="w-4 h-4" /> Yangi o'tkazma
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'DRAFT', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}>
            {s === '' ? 'Hammasi' : STATUS_LABELS[s]?.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['O\'tkazma #', 'Manba', 'Manzil', 'Mahsulotlar', 'Sana', 'Holat', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">Yuklanmoqda...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">O'tkazmalar yo'q</td></tr>
            ) : transfers.map((t: any) => {
              const st = STATUS_LABELS[t.status] ?? { label: t.status, color: 'bg-gray-500/20 text-gray-300' }
              return (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white text-sm font-mono">{t.transferNumber}</td>
                  <td className="px-4 py-3 text-gray-200 text-sm">{t.fromWarehouse?.name}</td>
                  <td className="px-4 py-3 text-gray-200 text-sm">{t.toWarehouse?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{t._count?.items ?? 0} ta</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(t.createdAt).toLocaleDateString('uz')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'DRAFT' && (
                      <div className="flex gap-1">
                        <button onClick={() => confirmMut.mutate(t.id)}
                          className="p-1.5 text-gray-400 hover:text-green-400" title="Tasdiqlash">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('O\'chirasizmi?')) deleteMut.mutate(t.id) }}
                          className="p-1.5 text-gray-400 hover:text-red-400" title="O'chirish">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && <StockTransferFormModal onClose={() => setShowForm(false)} />}
    </div>
  )
}
