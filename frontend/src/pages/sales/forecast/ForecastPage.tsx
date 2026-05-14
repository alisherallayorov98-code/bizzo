import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Target, TrendingUp, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function ForecastBar({ label, target, actual, pipeline }: {
  label: string; target: number; actual: number; pipeline: number
}) {
  const max = Math.max(target, actual, pipeline, 1)
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="flex items-end gap-0.5 h-24">
        {target > 0 && (
          <div
            title={`Maqsad: ${target.toLocaleString()}`}
            style={{ height: `${(target / max) * 100}%` }}
            className="w-3 bg-[var(--color-border-secondary)] rounded-t-sm min-h-[2px]"
          />
        )}
        <div
          title={`Haqiqiy: ${actual.toLocaleString()}`}
          style={{ height: `${(actual / max) * 100}%` }}
          className="w-3 bg-[var(--color-success)] rounded-t-sm min-h-[2px]"
        />
        <div
          title={`Pipeline: ${pipeline.toLocaleString()}`}
          style={{ height: `${(pipeline / max) * 100}%` }}
          className="w-3 bg-[var(--color-accent-primary)]/50 rounded-t-sm min-h-[2px]"
        />
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  )
}

function SetTargetModal({ period, onClose }: { period: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [error, setError]   = useState('')

  const mut = useMutation({
    mutationFn: () => api.post('/sales-forecast/target', {
      period, targetAmount: Number(amount), currency: 'UZS', periodType: 'MONTHLY',
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forecast'] }); toast.success('Maqsad saqlandi'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) { setError('Maqsad summasini kiriting'); return }
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <h2 className="text-[var(--color-text-primary)] font-semibold">Maqsad belgilash — {period}</h2>
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
            Maqsad (UZS) <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            className={[
              'w-full bg-[var(--color-bg-elevated)]',
              'border rounded-lg px-3 py-2 text-sm',
              'text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none transition-colors',
              error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-primary)] focus:border-[var(--color-accent-primary)]',
            ].join(' ')}
            placeholder="10 000 000"
          />
          {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] rounded-lg hover:border-[var(--color-border-secondary)] transition-colors"
          >
            Bekor
          </button>
          <button
            onClick={handleSave}
            disabled={mut.isPending}
            className="px-4 py-2 bg-[var(--color-accent-primary)] hover:opacity-90 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-opacity"
          >
            {mut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const kpis: any[]   = Array.isArray(kpiData)   ? kpiData  : (kpiData?.kpis   ?? [])

  const totalTarget = months.reduce((s: number, m: any) => s + (m.target ?? 0), 0)
  const totalActual = months.reduce((s: number, m: any) => s + (m.actual ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Savdo Prognozi</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Oylik va yillik savdo maqsadlari</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[var(--color-text-primary)] font-semibold w-14 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Yillik maqsad',
            value: fmt(totalTarget),
            icon: <Target className="w-4 h-4" />,
            cls:  'text-[var(--color-text-primary)]',
            iconCls: 'text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)]',
          },
          {
            label: 'Haqiqiy savdo',
            value: fmt(totalActual),
            icon: <TrendingUp className="w-4 h-4" />,
            cls:  'text-[var(--color-success)]',
            iconCls: 'text-[var(--color-success)] bg-[var(--color-success)]/10',
          },
          {
            label: 'Bajarish darajasi',
            value: totalTarget > 0 ? `${Math.round(totalActual / totalTarget * 100)}%` : '—',
            icon: <TrendingUp className="w-4 h-4" />,
            cls:  totalActual >= totalTarget ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]',
            iconCls: totalActual >= totalTarget ? 'text-[var(--color-success)] bg-[var(--color-success)]/10' : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
          },
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-4">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg mb-2 text-xs ${s.iconCls}`}>
              {s.icon} <span>{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-border-secondary)] inline-block" />Maqsad
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-success)] inline-block" />Haqiqiy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-primary)]/50 inline-block" />Pipeline
          </span>
        </div>
        {isLoading ? (
          <div className="h-32 bg-[var(--color-bg-elevated)] rounded-lg animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 justify-around min-w-[480px]">
              {months.length > 0
                ? months.map((m: any, i: number) => (
                    <ForecastBar key={i} label={MONTHS[i]} target={m.target ?? 0} actual={m.actual ?? 0} pipeline={m.pipeline ?? 0} />
                  ))
                : MONTHS.map((label, i) => (
                    <ForecastBar key={i} label={label} target={0} actual={0} pipeline={0} />
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Monthly targets */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border-primary)] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Oylik maqsadlar</h3>
          <span className="text-xs text-[var(--color-text-muted)]">Maqsad belgilash uchun bosing</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-[var(--color-bg-elevated)] rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-primary)]/50">
            {MONTHS.map((label, i) => {
              const period = `${year}-${String(i + 1).padStart(2, '0')}`
              const m = months[i] ?? {}
              const progress = m.target > 0 ? Math.min(100, Math.round(m.actual / m.target * 100)) : 0
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <span className="text-sm text-[var(--color-text-secondary)] w-8 shrink-0">{label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                      <span>{(m.actual ?? 0).toLocaleString()} UZS</span>
                      <span>{(m.target ?? 0).toLocaleString()} UZS</span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 ? 'bg-[var(--color-success)]' :
                          progress >= 70  ? 'bg-[var(--color-accent-primary)]' :
                          'bg-[var(--color-warning)]'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-8 text-right shrink-0">{progress}%</span>
                  <button
                    onClick={() => setTargetModal(period)}
                    className="text-xs text-[var(--color-accent-primary)] hover:underline shrink-0 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
                  >
                    Maqsad
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* KPI table */}
      {kpis.length > 0 && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Sotuv bo'yicha KPI (joriy oy)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['Sotuv menejer', 'Maqsad', 'Haqiqiy', 'Yutilgan bitimlar', 'Win Rate', 'Bajarish'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-[var(--color-text-muted)] font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.map((k: any) => (
                  <tr key={k.userId ?? k.name} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-elevated)] transition-colors">
                    <td className="px-4 py-2.5 text-sm text-[var(--color-text-primary)] font-medium">
                      {k.name ?? `${k.firstName ?? ''} ${k.lastName ?? ''}`.trim()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">{(k.target ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--color-text-primary)] font-medium">{(k.actual ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">{k.dealsWon ?? 0}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">{k.winRate ?? 0}%</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-accent-primary)] rounded-full"
                            style={{ width: `${Math.min(100, k.progress ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">{k.progress ?? 0}%</span>
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
