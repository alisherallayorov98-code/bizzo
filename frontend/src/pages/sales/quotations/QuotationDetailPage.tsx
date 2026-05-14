import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, CheckCircle, XCircle, FileInput, AlertCircle } from 'lucide-react'
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

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: q, isLoading, isError } = useQuery({
    queryKey: ['quotation', id],
    queryFn:  () => api.get(`/quotations/${id}`).then(r => r.data),
    enabled:  !!id,
  })

  const mutOpts = (msg: string) => ({
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotation', id] }); qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success(msg) },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const sendMut    = useMutation({ mutationFn: () => api.patch(`/quotations/${id}/send`),    ...mutOpts('Yuborildi') })
  const approveMut = useMutation({ mutationFn: () => api.patch(`/quotations/${id}/approve`), ...mutOpts('Tasdiqlandi') })
  const rejectMut  = useMutation({
    mutationFn: () => {
      const reason = prompt('Rad etish sababi (ixtiyoriy):') ?? undefined
      return api.patch(`/quotations/${id}/reject`, { reason })
    },
    ...mutOpts('Rad etildi'),
  })
  const convertMut = useMutation({
    mutationFn: () => api.post(`/quotations/${id}/convert`).then(r => r.data),
    onSuccess:  (inv: any) => {
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      toast.success('Invoice yaratildi!')
      if (inv?.id) navigate(`/sales/invoices/${inv.id}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  if (isLoading) return <div className="p-6 text-gray-400">Yuklanmoqda...</div>
  if (isError || !q) return (
    <div className="p-6 flex flex-col items-center gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-400">Taklifnoma topilmadi</p>
      <button onClick={() => navigate('/sales/quotations')} className="text-blue-400 hover:underline text-sm">Orqaga</button>
    </div>
  )

  const st = STATUS_CFG[q.status] ?? { label: q.status, color: 'bg-gray-500/20 text-gray-300' }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sales/quotations')}
            className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{q.quoteNumber}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {q.status === 'DRAFT' && (
            <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
              <Send className="w-4 h-4" /> Yuborish
            </button>
          )}
          {q.status === 'SENT' && (
            <>
              <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg">
                <CheckCircle className="w-4 h-4" /> Tasdiqlash
              </button>
              <button onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">
                <XCircle className="w-4 h-4" /> Rad etish
              </button>
            </>
          )}
          {['APPROVED', 'SENT'].includes(q.status) && (
            <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg">
              <FileInput className="w-4 h-4" /> Invoice ga o'tkazish
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact */}
        <div className="bg-[#0D1628] border border-white/10 rounded-xl p-4">
          <h3 className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Mijoz</h3>
          <p className="text-white font-semibold">{q.contact?.name}</p>
          {q.contact?.phone && <p className="text-gray-400 text-sm mt-1">{q.contact.phone}</p>}
          {q.contact?.email && <p className="text-gray-400 text-sm">{q.contact.email}</p>}
        </div>

        {/* Meta */}
        <div className="bg-[#0D1628] border border-white/10 rounded-xl p-4">
          <h3 className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Ma'lumotlar</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Sana:</span>
              <span className="text-white">{new Date(q.createdAt).toLocaleDateString('uz')}</span>
            </div>
            {q.validUntil && (
              <div className="flex justify-between">
                <span className="text-gray-400">Amal muddati:</span>
                <span className={new Date(q.validUntil) < new Date() ? 'text-red-400' : 'text-white'}>
                  {new Date(q.validUntil).toLocaleDateString('uz')}
                </span>
              </div>
            )}
            {q.deal && (
              <div className="flex justify-between">
                <span className="text-gray-400">Bitim:</span>
                <span className="text-white">{q.deal.dealNumber}</span>
              </div>
            )}
            {q.createdBy && (
              <div className="flex justify-between">
                <span className="text-gray-400">Yaratdi:</span>
                <span className="text-white">{q.createdBy.firstName} {q.createdBy.lastName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['#', 'Nomi', 'Miqdor', 'Birlik', 'Narx', 'Chegirma', 'Jami'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.items?.map((item: any, i: number) => (
              <tr key={item.id} className="border-b border-white/5">
                <td className="px-4 py-2.5 text-gray-500 text-sm">{i + 1}</td>
                <td className="px-4 py-2.5 text-gray-200 text-sm">{item.name}</td>
                <td className="px-4 py-2.5 text-gray-300 text-sm">{Number(item.quantity)}</td>
                <td className="px-4 py-2.5 text-gray-400 text-sm">{item.unit}</td>
                <td className="px-4 py-2.5 text-white text-sm">{Number(item.unitPrice).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-gray-400 text-sm">{Number(item.discount)}%</td>
                <td className="px-4 py-2.5 text-white text-sm font-medium">{Number(item.totalPrice).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-white/10 p-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8 text-gray-400"><span>Oraliq:</span><span className="text-white">{Number(q.subtotal).toLocaleString()}</span></div>
          {Number(q.discount) > 0 && <div className="flex gap-8 text-red-400"><span>Chegirma ({q.discount}%):</span><span>-{(Number(q.subtotal) * Number(q.discount) / 100).toLocaleString()}</span></div>}
          {Number(q.taxRate) > 0  && <div className="flex gap-8 text-yellow-400"><span>QQS ({q.taxRate}%):</span><span>+{((Number(q.subtotal) * (1 - Number(q.discount)/100)) * Number(q.taxRate) / 100).toLocaleString()}</span></div>}
          <div className="flex gap-8 font-bold text-white text-base border-t border-white/10 pt-2 mt-1">
            <span>Jami:</span><span>{Number(q.totalAmount).toLocaleString()} UZS</span>
          </div>
        </div>
      </div>

      {q.notes && (
        <div className="bg-[#0D1628] border border-white/10 rounded-xl p-4">
          <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Izoh</h3>
          <p className="text-gray-300 text-sm">{q.notes}</p>
        </div>
      )}

      {q.rejectedReason && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h3 className="text-xs text-red-400 mb-1 uppercase tracking-wide">Rad etish sababi</h3>
          <p className="text-red-300 text-sm">{q.rejectedReason}</p>
        </div>
      )}
    </div>
  )
}
