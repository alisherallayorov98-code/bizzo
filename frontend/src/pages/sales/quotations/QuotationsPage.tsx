import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FileText, Send, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',    color: 'bg-gray-500/20 text-gray-300' },
  SENT:      { label: 'Yuborildi',   color: 'bg-blue-500/20 text-blue-300' },
  APPROVED:  { label: 'Tasdiqlandi', color: 'bg-green-500/20 text-green-300' },
  REJECTED:  { label: 'Rad etildi',  color: 'bg-red-500/20 text-red-300' },
  EXPIRED:   { label: 'Muddati o\'tgan', color: 'bg-orange-500/20 text-orange-300' },
  CONVERTED: { label: 'Invoice ga o\'tkazildi', color: 'bg-purple-500/20 text-purple-300' },
}

function useQuotations(filters: any) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn:  () => api.get('/quotations', { params: filters }).then(r => r.data),
  })
}

function useContacts() {
  return useQuery({
    queryKey: ['contacts-all'],
    queryFn:  () => api.get('/contacts', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

function useDeals() {
  return useQuery({
    queryKey: ['deals-active'],
    queryFn:  () => api.get('/deals', { params: { limit: 200 } }).then(r => r.data.data ?? r.data),
  })
}

function useProducts() {
  return useQuery({
    queryKey: ['products-all'],
    queryFn:  () => api.get('/products', { params: { limit: 500 } }).then(r => r.data.data ?? r.data),
  })
}

interface QLine { name: string; productId?: string; quantity: number; unit: string; unitPrice: number; discount: number }

function QuotationFormModal({ onClose, editItem }: { onClose: () => void; editItem?: any }) {
  const qc = useQueryClient()
  const { data: contacts = [] } = useContacts()
  const { data: deals    = [] } = useDeals()
  const { data: products = [] } = useProducts()

  const [contactId,   setContactId]   = useState(editItem?.contactId   ?? '')
  const [dealId,      setDealId]      = useState(editItem?.dealId      ?? '')
  const [validUntil,  setValidUntil]  = useState(editItem?.validUntil  ? editItem.validUntil.slice(0, 10) : '')
  const [notes,       setNotes]       = useState(editItem?.notes       ?? '')
  const [discount,    setDiscount]    = useState(editItem?.discount     ?? 0)
  const [taxRate,     setTaxRate]     = useState(editItem?.taxRate      ?? 0)
  const [lines, setLines] = useState<QLine[]>(
    editItem?.items?.map((i: any) => ({
      name: i.name, productId: i.productId, quantity: Number(i.quantity),
      unit: i.unit, unitPrice: Number(i.unitPrice), discount: Number(i.discount),
    })) ?? [{ name: '', productId: '', quantity: 1, unit: 'dona', unitPrice: 0, discount: 0 }]
  )

  const mutation = useMutation({
    mutationFn: (body: any) => editItem
      ? api.patch(`/quotations/${editItem.id}`, body).then(r => r.data)
      : api.post('/quotations', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success(editItem ? 'Yangilandi' : 'Taklifnoma yaratildi'); onClose() },
    onError:   () => toast.error('Xatolik'),
  })

  const addLine    = () => setLines(l => [...l, { name: '', productId: '', quantity: 1, unit: 'dona', unitPrice: 0, discount: 0 }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const setLine    = (i: number, field: keyof QLine, val: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: val } : ln))

  const onProductChange = (i: number, productId: string) => {
    const p = (products as any[]).find((x: any) => x.id === productId)
    if (p) setLines(l => l.map((ln, idx) => idx === i
      ? { ...ln, productId, name: p.name, unit: p.unit, unitPrice: Number(p.sellPrice) }
      : ln))
    else setLine(i, 'productId', productId)
  }

  const subtotal   = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0)
  const discAmt    = subtotal * (discount / 100)
  const afterDisc  = subtotal - discAmt
  const taxAmt     = afterDisc * (taxRate / 100)
  const total      = afterDisc + taxAmt

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId || lines.some(l => !l.name)) { toast.error('Barcha maydonlarni to\'ldiring'); return }
    mutation.mutate({ contactId, dealId: dealId || undefined, validUntil: validUntil || undefined, notes, discount, taxRate, items: lines })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form onSubmit={submit} className="bg-[#0D1628] border border-white/10 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">{editItem ? 'Taklifnomani tahrirlash' : 'Yangi taklifnoma'}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Mijoz *</label>
            <select value={contactId} onChange={e => setContactId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Tanlang...</option>
              {(contacts as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Bitim (ixtiyoriy)</label>
            <select value={dealId} onChange={e => setDealId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">—</option>
              {(deals as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.dealNumber} — {d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Amal qilish muddati</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Izoh</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Chegirma %</label>
            <input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Soliq (QQS) %</label>
            <input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Mahsulotlar / Xizmatlar</span>
            <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ Qo'shish</button>
          </div>
          <div className="grid grid-cols-[1fr_140px_80px_80px_90px_80px_28px] gap-1 text-xs text-gray-500 px-1">
            <span>Nomi</span><span>Mahsulot</span><span>Miqdor</span><span>Birlik</span><span>Narx</span><span>Chegirma%</span><span/>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_80px_80px_90px_80px_28px] gap-1 items-center">
              <input value={line.name} onChange={e => setLine(i, 'name', e.target.value)} placeholder="Nomi *"
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
              <select value={line.productId ?? ''} onChange={e => onProductChange(i, e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-1 py-1.5 text-white text-xs">
                <option value="">—</option>
                {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min={0} step="any" value={line.quantity}
                onChange={e => setLine(i, 'quantity', Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
              <input value={line.unit} onChange={e => setLine(i, 'unit', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
              <input type="number" min={0} step="any" value={line.unitPrice}
                onChange={e => setLine(i, 'unitPrice', Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
              <input type="number" min={0} max={100} value={line.discount}
                onChange={e => setLine(i, 'discount', Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
              <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300 text-sm text-center">✕</button>
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1 text-gray-300">
          <div className="flex justify-between"><span>Oraliq summa:</span><span>{subtotal.toLocaleString()}</span></div>
          {discount > 0 && <div className="flex justify-between text-red-400"><span>Chegirma ({discount}%):</span><span>-{discAmt.toLocaleString()}</span></div>}
          {taxRate > 0  && <div className="flex justify-between text-yellow-400"><span>QQS ({taxRate}%):</span><span>+{taxAmt.toLocaleString()}</span></div>}
          <div className="flex justify-between font-bold text-white border-t border-white/10 pt-1"><span>Jami:</span><span>{total.toLocaleString()} UZS</span></div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
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

export default function QuotationsPage() {
  const qc = useQueryClient()
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState<any>(null)
  const [statusFilter,setStatusFilter]= useState('')

  const { data, isLoading } = useQuotations({ status: statusFilter || undefined })
  const items = data?.data ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/quotations/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('O\'chirildi') },
    onError:    () => toast.error('Xatolik'),
  })

  const sendMut = useMutation({
    mutationFn: (id: string) => api.patch(`/quotations/${id}/send`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Yuborildi') },
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Taklifnomalar</h1>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
          <Plus className="w-4 h-4" /> Yangi taklifnoma
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_CFG)].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}>
            {s === '' ? 'Hammasi' : STATUS_CFG[s]?.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['№', 'Mijoz', 'Jami', 'Amal muddati', 'Sana', 'Holat', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">Yuklanmoqda...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">Taklifnomalar yo'q</td></tr>
            ) : items.map((q: any) => {
              const st  = STATUS_CFG[q.status] ?? { label: q.status, color: 'bg-gray-500/20 text-gray-300' }
              const exp = q.validUntil && new Date(q.validUntil) < new Date() && q.status === 'SENT'
              return (
                <tr key={q.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white text-sm font-mono">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-gray-200 text-sm">{q.contact?.name}</td>
                  <td className="px-4 py-3 text-white text-sm">{Number(q.totalAmount).toLocaleString()}</td>
                  <td className={`px-4 py-3 text-sm ${exp ? 'text-red-400' : 'text-gray-400'}`}>
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString('uz') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(q.createdAt).toLocaleDateString('uz')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/sales/quotations/${q.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-400">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {q.status === 'DRAFT' && (
                        <>
                          <button onClick={() => { setEditItem(q); setShowForm(true) }}
                            className="p-1.5 text-gray-400 hover:text-yellow-400">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => sendMut.mutate(q.id)}
                            className="p-1.5 text-gray-400 hover:text-purple-400">
                            <Send className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm('O\'chirasizmi?')) deleteMut.mutate(q.id) }}
                            className="p-1.5 text-gray-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && <QuotationFormModal editItem={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} />}
    </div>
  )
}
