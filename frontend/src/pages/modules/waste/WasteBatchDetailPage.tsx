import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { wasteService } from '@services/waste.service'
import { contactService } from '@services/contact.service'

const fmt   = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))
const fmtKg = (n: number) => `${n.toFixed(2)} kg`

export default function WasteBatchDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const nav     = useNavigate()
  const qc      = useQueryClient()
  const [sellOpen, setSellOpen] = useState(false)
  const [sellForm, setSellForm] = useState({ buyerId: '', sellPricePerKg: 0, weight: 0, notes: '' })

  const { data: batch, isLoading } = useQuery({
    queryKey: ['waste-batch', id],
    queryFn:  () => wasteService.getBatchById(id!),
    enabled:  !!id,
  })

  const { data: contacts } = useQuery({
    queryKey: ['contacts-list'],
    queryFn:  () => contactService.getAll({ limit: 200 }),
  })

  const sellMutation = useMutation({
    mutationFn: (payload: typeof sellForm) => wasteService.sellBatch(id!, payload),
    onSuccess: () => {
      toast.success("Partiya sotildi. Qarz yozuvi yaratildi.")
      qc.invalidateQueries({ queryKey: ['waste-batch', id] })
      qc.invalidateQueries({ queryKey: ['waste-batches'] })
      setSellOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  if (isLoading || !batch) return (
    <div className="p-8 text-center text-zinc-500">Yuklanmoqda...</div>
  )

  const statusColor: Record<string, string> = {
    IN_STOCK:   'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-yellow-100 text-yellow-700',
    COMPLETED:  'bg-green-100 text-green-700',
    SOLD:       'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => nav(-1)} className="text-zinc-400 hover:text-zinc-600">← Orqaga</button>
        <div>
          <h1 className="text-2xl font-bold">Partiya #{batch.batchNumber}</h1>
          <p className="text-zinc-500 text-sm">{new Date(batch.receivedAt).toLocaleDateString('uz-UZ')}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${statusColor[batch.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
          {batch.status}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Kirish og\'irligi',  value: fmtKg(batch.inputWeight) },
          { label: 'Qayta ishlangan',    value: fmtKg(batch.summary.totalProcessed) },
          { label: 'Qolgan',             value: fmtKg(batch.summary.remaining) },
          { label: 'Umumiy xarid narx',  value: `${fmt(batch.totalCost)} so'm` },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
            <p className="text-lg font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {batch.status === 'IN_STOCK' || batch.status === 'COMPLETED' ? (
        <div className="flex gap-3">
          <button
            onClick={() => { setSellForm(f => ({ ...f, weight: batch.summary.remaining })); setSellOpen(true) }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Sotish
          </button>
        </div>
      ) : null}

      {/* Processing records */}
      <section>
        <h2 className="font-semibold mb-3">Qayta ishlash yozuvlari</h2>
        {batch.processingRecords.length === 0 ? (
          <p className="text-zinc-400 text-sm">Hali qayta ishlash yo'q</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  {['Sana', 'Qayta ishlangan', 'Chiqdi', 'Yo\'qotish', 'Yo\'qotish %'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.processingRecords.map((r: any) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-4 py-2">{new Date(r.processedAt).toLocaleDateString('uz-UZ')}</td>
                    <td className="px-4 py-2">{fmtKg(r.processedWeight)}</td>
                    <td className="px-4 py-2">{fmtKg(r.outputWeight)}</td>
                    <td className="px-4 py-2 text-red-500">{fmtKg(r.lossWeight)}</td>
                    <td className="px-4 py-2">{r.lossPercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workers */}
      <section>
        <h2 className="font-semibold mb-3">Xodimlar</h2>
        {batch.workerAssignments.length === 0 ? (
          <p className="text-zinc-400 text-sm">Hali xodim tayinlanmagan</p>
        ) : (
          <div className="overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  {['Xodim', 'Sana', 'Soat', 'Summa', 'To\'langan'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.workerAssignments.map((w: any) => (
                  <tr key={w.id} className="border-t border-zinc-100">
                    <td className="px-4 py-2">{w.employee ? `${w.employee.firstName} ${w.employee.lastName}` : w.employeeId}</td>
                    <td className="px-4 py-2">{new Date(w.workDate).toLocaleDateString('uz-UZ')}</td>
                    <td className="px-4 py-2">{w.hoursWorked}h</td>
                    <td className="px-4 py-2">{fmt(w.amount)} so'm</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${w.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {w.isPaid ? "To'langan" : "Kutilmoqda"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sell Modal */}
      {sellOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Partiyani Sotish</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Xaridor</label>
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={sellForm.buyerId}
                  onChange={e => setSellForm(f => ({ ...f, buyerId: e.target.value }))}
                >
                  <option value="">Xaridor tanlang</option>
                  {contacts?.data?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Og'irlik (kg)</label>
                <input
                  type="number" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={sellForm.weight}
                  onChange={e => setSellForm(f => ({ ...f, weight: +e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Narx (so'm/kg)</label>
                <input
                  type="number" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={sellForm.sellPricePerKg}
                  onChange={e => setSellForm(f => ({ ...f, sellPricePerKg: +e.target.value }))}
                />
              </div>
              {sellForm.weight > 0 && sellForm.sellPricePerKg > 0 && (
                <p className="text-sm font-medium text-green-600">
                  Jami: {fmt(sellForm.weight * sellForm.sellPricePerKg)} so'm
                </p>
              )}
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Izoh</label>
                <input
                  type="text" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  value={sellForm.notes}
                  onChange={e => setSellForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSellOpen(false)} className="px-4 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50">Bekor</button>
              <button
                onClick={() => sellMutation.mutate(sellForm)}
                disabled={!sellForm.buyerId || !sellForm.weight || !sellForm.sellPricePerKg || sellMutation.isPending}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {sellMutation.isPending ? 'Saqlanmoqda...' : 'Sotish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
