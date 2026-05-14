import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Target, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ─── Bar Chart ───────────────────────────────────────────────────
function ForecastBar({ label, target, actual, pipeline }: {
  label: string; target: number; actual: number; pipeline: number
}) {
  const max = Math.max(target, actual, pipeline, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-0.5 h-24">
        {target > 0 && (
          <div title={`Maqsad: ${target.toLocaleString()}`}
            style={{ height: `${(target / max) * 100}%` }}
            className="w-3 bg-gray-500/50 rounded-t-sm min-h-[2px]" />
        )}
        <div title={`Haqiqiy: ${actual.toLocaleString()}`}
          style={{ height: `${(actual / max) * 100}%` }}
          className="w-3 bg-green-500 rounded-t-sm min-h-[2px]" />
        <div title={`Pipeline: ${pipeline.toLocaleString()}`}
          style={{ height: `${(pipeline / max) * 100}%` }}
          className="w-3 bg-blue-500/50 rounded-t-sm min-h-[2px]" />
      </div>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}

// ─── Set Target Modal ────────────────────────────────────────────
function SetTargetModal({ period, onClose }: { period: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')

  const mut = useMutation({
    mutationFn: () => api.post('/sales-forecast/target', { period, targetAmount: Number(amount), currency: 'UZS', periodType: 'MONTHLY' }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forecast'] }); toast.success('Maqsad saqlandi'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0D1628] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-white font-semibold">Maqsad belgilash — {period}</h2>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Maqsad (UZS)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="10000000" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Bekor</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending || !amount}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg">
            Saqlash
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────
export default function ForecastPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [targetModal, setTargetModal] = useState<string | null>(null)

  const { data: forecast, isLoading } = useQuery({
    queryKey: ['forecast', year],
    queryFn: () => api.get(`/sales-forecast/forecast?year=${year}`).then(r => r.data),
  })

  const { data: kpiData } = useQuery({
    queryKey: ['forecast-kpi', year],
    queryFn: () => api.get(`/sales-forecast/kpi?period=${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).then(r => r.data),
  })

  const months: any[] = Array.isArray(forecast) ? forecast : (forecast?.months ?? [])
  const kpis: any[]   = Array.isArray(kpiData)   ? kpiData  : (kpiData?.kpis ?? [])

  const totalTarget = months.reduce((s: number, m: any) => s + (m.target ?? 0), 0)
  const totalActual = months.reduce((s: number, m: any) => s + (m.actual ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Savdo Prognozi</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold w-12 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Yillik maqsad', value: fmt(totalTarget), icon: <Target className="w-4 h-4" />, color: 'text-gray-300' },
          { label: 'Haqiqiy savdo', value: fmt(totalActual), icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400' },
          { label: "Bajarish darajasi", value: totalTarget > 0 ? `${Math.round(totalActual / totalTarget * 100)}%` : '—',
            icon: <TrendingUp className="w-4 h-4" />, color: totalActual >= totalTarget ? 'text-green-400' : 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#0D1628] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#0D1628] border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-500/50 inline-block" />Maqsad</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Haqiqiy</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/50 inline-block" />Pipeline</span>
        </div>
        {isLoading ? (
          <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-end gap-2 justify-around">
            {months.length > 0 ? months.map((m: any, i: number) => (
              <ForecastBar
                key={i}
                label={MONTHS[i]}
                target={m.target ?? 0}
                actual={m.actual ?? 0}
                pipeline={m.pipeline ?? 0}
              />
            )) : MONTHS.map((label, i) => (
              <ForecastBar key={i} label={label} target={0} actual={0} pipeline={0} />
            ))}
          </div>
        )}
      </div>

      {/* Monthly targets */}
      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Oylik maqsadlar</h3>
          <span className="text-xs text-gray-400">Maqsad belgilash uchun bosing</span>
        </div>
        <div className="divide-y divide-white/5">
          {MONTHS.map((label, i) => {
            const period = `${year}-${String(i + 1).padStart(2, '0')}`
            const m = months[i] ?? {}
            const progress = m.target > 0 ? Math.min(100, Math.round(m.actual / m.target * 100)) : 0
            return (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <span className="text-sm text-gray-300 w-8">{label}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{m.actual?.toLocaleString() ?? 0} UZS</span>
                    <span>{m.target?.toLocaleString() ?? 0} UZS</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{progress}%</span>
                <button onClick={() => setTargetModal(period)}
                  className="text-xs text-blue-400 hover:text-blue-300 shrink-0">
                  Maqsad
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPI table */}
      {kpis.length > 0 && (
        <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">Sotuv bo'yicha KPI (joriy oy)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Sotuv menejer', 'Maqsad', 'Haqiqiy', "Yutilgan bitimlar", 'Win Rate', 'Bajarish'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((k: any) => (
                  <tr key={k.userId ?? k.name} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-sm text-white">{k.name ?? `${k.firstName ?? ''} ${k.lastName ?? ''}`.trim()}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300">{(k.target ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-white">{(k.actual ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300">{k.dealsWon ?? 0}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300">{k.winRate ?? 0}%</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, k.progress ?? 0)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{k.progress ?? 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {targetModal && <SetTargetModal period={targetModal} onClose={() => setTargetModal(null)} />}
    </div>
  )
}
