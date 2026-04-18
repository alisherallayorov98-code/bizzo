import { useState }          from 'react'
import { useQuery }           from '@tanstack/react-query'
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { reportService }      from '@services/report.service'
import { Card }               from '@components/ui/Card/Card'
import { Skeleton }           from '@components/ui/Skeleton/Skeleton'
import { formatCurrency }     from '@utils/formatters'
import { cn }                 from '@utils/cn'

type Tab = 'sales' | 'stock' | 'debts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sales', label: 'Savdo' },
  { id: 'stock', label: 'Ombor' },
  { id: 'debts', label: 'Qarzlar' },
]

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-elevated)',
  border:          '1px solid var(--color-border-primary)',
  borderRadius:    '8px',
  fontSize:        '12px',
  color:           'var(--color-text-primary)',
}

const AXIS_TICK = { fill: 'var(--color-text-muted)', fontSize: 11 }
const GRID_STROKE = 'var(--color-border-primary)'
const fmt = (v: number) => `${(v / 1_000_000).toFixed(1)}M`

export function DashboardCharts() {
  const [tab, setTab] = useState<Tab>('sales')

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'charts'],
    queryFn:  () => reportService.getChartsData(),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <Card padding="md">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-text-primary">Dinamika grafiklari</h3>
          <p className="text-xs text-text-muted mt-0.5">{new Date().getFullYear()} yil</p>
        </div>
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                tab === t.id
                  ? 'bg-bg-elevated text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          {tab === 'sales' ? (
            <AreaChart data={data?.sales ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSotuv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-accent-primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gMaqsad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-text-muted)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="var(--color-text-muted)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === 'sotuv' ? 'Savdo' : 'Maqsad',
                ]}
              />
              <Legend
                formatter={v => v === 'sotuv' ? 'Savdo' : 'Maqsad'}
                wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
              />
              <Area type="monotone" dataKey="maqsad" stroke="var(--color-text-muted)"   strokeWidth={1} strokeDasharray="4 4" fill="url(#gMaqsad)" />
              <Area type="monotone" dataKey="sotuv"  stroke="var(--color-accent-primary)" strokeWidth={2} fill="url(#gSotuv)" />
            </AreaChart>
          ) : tab === 'stock' ? (
            <BarChart data={data?.stock ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === 'kirim' ? 'Kirim' : 'Chiqim',
                ]}
              />
              <Legend
                formatter={v => v === 'kirim' ? 'Kirim' : 'Chiqim'}
                wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
              />
              <Bar dataKey="kirim"  fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={30} />
              <Bar dataKey="chiqim" fill="var(--color-danger)"  radius={[3, 3, 0, 0]} maxBarSize={30} />
            </BarChart>
          ) : (
            <BarChart data={data?.debts ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [
                  formatCurrency(v),
                  name === 'debtor' ? 'Debitor' : 'Kreditor',
                ]}
              />
              <Legend
                formatter={v => v === 'debtor' ? 'Debitor' : 'Kreditor'}
                wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }}
              />
              <Bar dataKey="debtor"   fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={30} />
              <Bar dataKey="creditor" fill="var(--color-warning)" radius={[3, 3, 0, 0]} maxBarSize={30} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </Card>
  )
}
