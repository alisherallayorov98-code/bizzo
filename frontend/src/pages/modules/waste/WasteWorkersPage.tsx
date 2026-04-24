import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wasteService } from '@services/waste.service'

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

export default function WasteWorkersPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [tab,      setTab]      = useState<'summary' | 'records'>('summary')

  const { data, isLoading } = useQuery({
    queryKey:  ['waste-workers-report', dateFrom, dateTo],
    queryFn:   () => wasteService.getWorkersReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    staleTime: 30_000,
  })

  const summary = data?.summary ?? []
  const records = data?.records ?? []

  const totalUnpaid = summary.reduce((s, r) => s + r.unpaidAmount, 0)
  const totalAmount = summary.reduce((s, r) => s + r.totalAmount,  0)
  const totalShifts = summary.reduce((s, r) => s + r.shifts,        0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xodimlar ishi (Chiqindi)</h1>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-zinc-400 self-center">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Jami to\'lov',    value: `${fmt(totalAmount)} so'm`,  color: 'text-zinc-800' },
          { label: "To'lanmagan",     value: `${fmt(totalUnpaid)} so'm`,  color: 'text-red-600'  },
          { label: 'Jami navbatlar',  value: String(totalShifts),         color: 'text-zinc-800' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
            <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
        {([['summary', 'Xodimlar xulosasi'], ['records', 'Barcha yozuvlar']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-400">Yuklanmoqda...</div>
      ) : tab === 'summary' ? (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                {["Xodim", "Lavozim", "Navbatlar", "Jami soat", "Jami summa", "To'lanmagan"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Ma'lumot yo'q</td></tr>
              ) : summary.map((row, i) => (
                <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">
                    {row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{row.employee?.position ?? '—'}</td>
                  <td className="px-4 py-3">{row.shifts}</td>
                  <td className="px-4 py-3">{row.totalHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 font-medium">{fmt(row.totalAmount)} so'm</td>
                  <td className="px-4 py-3">
                    {row.unpaidAmount > 0
                      ? <span className="text-red-600 font-medium">{fmt(row.unpaidAmount)} so'm</span>
                      : <span className="text-green-600 text-xs">✓ To'liq to'langan</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                {['Xodim', 'Partiya', 'Sana', 'Soat', 'Summa', "To'langan"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Ma'lumot yo'q</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">#{r.batch?.batchNumber}</td>
                  <td className="px-4 py-3">{new Date(r.workDate).toLocaleDateString('uz-UZ')}</td>
                  <td className="px-4 py-3">{r.hoursWorked}h</td>
                  <td className="px-4 py-3">{fmt(r.amount)} so'm</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${r.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {r.isPaid ? "To'langan" : "Kutilmoqda"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
