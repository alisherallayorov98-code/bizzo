import { useState } from 'react'
import {
  FileText, FileSpreadsheet,
  TrendingUp, Package, Users, Recycle, HardHat, Factory,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Badge }      from '@components/ui/Badge/Badge'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import {
  useFinancialReport, useWarehouseReport,
  useSalesReport, useEmployeesReport, useWasteReport,
  useConstructionReport, useProductionReport,
} from '@features/reports/hooks/useReports'
import { exportToExcel, exportToPDF } from '@utils/exporters'
import { formatCurrency, formatDate, formatWeight } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

// ============================================
// DAVR TANLASH
// ============================================
type Period = {
  label:        string
  days?:        number
  isMonth?:     boolean
  monthOffset?: number
  isYear?:      boolean
}

const QUICK_PERIODS: Period[] = [
  { label: 'Bu oy',       isMonth: true, monthOffset: 0  },
  { label: "O'tgan oy",   isMonth: true, monthOffset: -1 },
  { label: "So'nggi 30",  days: 30  },
  { label: "So'nggi 90",  days: 90  },
  { label: 'Bu yil',      isYear: true  },
]

function getDateRange(p: Period) {
  const now = new Date()
  let from: Date
  let to:   Date

  if (p.isYear) {
    from = new Date(now.getFullYear(), 0, 1)
    to   = new Date(now.getFullYear(), 11, 31)
  } else if (p.isMonth) {
    const m = now.getMonth() + (p.monthOffset ?? 0)
    from    = new Date(now.getFullYear(), m, 1)
    to      = new Date(now.getFullYear(), m + 1, 0)
  } else {
    from = new Date(now)
    from.setDate(from.getDate() - (p.days ?? 30))
    to = new Date(now)
  }

  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo:   to.toISOString().slice(0, 10),
  }
}

function PeriodSelector({
  filters,
  onChange,
}: {
  filters:  { dateFrom: string; dateTo: string }
  onChange: (f: { dateFrom: string; dateTo: string }) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_PERIODS.map(p => {
        const range    = getDateRange(p)
        const isActive =
          filters.dateFrom === range.dateFrom && filters.dateTo === range.dateTo
        return (
          <button
            key={p.label}
            onClick={() => onChange(range)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              isActive
                ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
                : 'border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
            )}
          >
            {p.label}
          </button>
        )
      })}
      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
          className="h-7 rounded-md text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:border-[var(--color-accent-primary)]"
        />
        <span className="text-[var(--color-text-muted)] text-xs">—</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => onChange({ ...filters, dateTo: e.target.value })}
          className="h-7 rounded-md text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:border-[var(--color-accent-primary)]"
        />
      </div>
    </div>
  )
}

// ============================================
// STAT KARTA
// ============================================
function StatCard({
  label,
  value,
  color = 'text-[var(--color-text-primary)]',
  bg    = 'bg-[var(--color-bg-secondary)]',
}: {
  label: string
  value: string | number
  color?: string
  bg?:   string
}) {
  return (
    <div className={cn('p-4 rounded-lg border border-[var(--color-border-primary)]', bg)}>
      <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{label}</p>
      <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
    </div>
  )
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-elevated)',
  border:          '1px solid var(--color-border-primary)',
  borderRadius:    'var(--radius-md)',
  fontSize:        12,
}

const CHART_COLORS = [
  'var(--color-accent-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-info)',
]

// ============================================
// MOLIYAVIY HISOBOT
// ============================================
function FinancialReport({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading, isError } = useFinancialReport(filters)
  if (isError) return <div className="py-12 text-center text-sm text-danger">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      [
        {
          name: 'Moliyaviy hisobot',
          data: [
            { "Ko'rsatkich": 'Jami daromad',  "Qiymat": data.summary.totalRevenue    },
            { "Ko'rsatkich": 'Jami xarajat',  "Qiymat": data.summary.totalExpenses   },
            { "Ko'rsatkich": 'Sof foyda',     "Qiymat": data.summary.netProfit       },
            { "Ko'rsatkich": 'Foyda foizi',   "Qiymat": `${data.summary.profitMargin}%` },
            { "Ko'rsatkich": 'Debitor qarz',  "Qiymat": data.summary.receivableTotal },
            { "Ko'rsatkich": 'Kreditor qarz', "Qiymat": data.summary.payableTotal    },
          ],
        },
        { name: 'Top sotuvlar', data: data.topSales },
      ],
      `moliyaviy-hisobot-${filters.dateFrom}`
    )
  }

  const handleExportPDF = () => {
    if (!data) return
    exportToPDF({
      title:    'BIZZO — Moliyaviy Hisobot',
      subtitle: 'Daromad va xarajatlar tahlili',
      period:   `${formatDate(filters.dateFrom)} — ${formatDate(filters.dateTo)}`,
      tables: [
        {
          title:   "Umumiy ko'rsatkichlar",
          headers: ["Ko'rsatkich", 'Qiymat'],
          rows: [
            ['Jami daromad',  formatCurrency(data.summary.totalRevenue)],
            ['Jami xarajat',  formatCurrency(data.summary.totalExpenses)],
            ['Sof foyda',     formatCurrency(data.summary.netProfit)],
            ['Foyda foizi',   `${data.summary.profitMargin}%`],
            ['Debitor qarz',  formatCurrency(data.summary.receivableTotal)],
            ['Kreditor qarz', formatCurrency(data.summary.payableTotal)],
          ],
          summary: [{ label: 'Sof balans:', value: formatCurrency(data.summary.netCashFlow) }],
        },
        {
          title:   'Eng yaxshi 10 ta sotuv',
          headers: ['Mijoz', 'Summa', 'Sana'],
          rows: (data.topSales ?? []).map((s: any) => [
            s.contact,
            formatCurrency(s.amount),
            formatDate(s.closedAt, 'short'),
          ]),
        },
      ],
      filename: `moliyaviy-hisobot-${filters.dateFrom}`,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
              <Skeleton height={12} width="60%" className="mb-2" />
              <Skeleton height={28} width="80%" />
            </div>
          ))}
        </div>
        <Skeleton height={200} className="rounded-lg" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet size={14} />}
          onClick={handleExportExcel}>
          Excel
        </Button>
        <Button variant="secondary" size="sm" leftIcon={<FileText size={14} />}
          onClick={handleExportPDF}>
          PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jami daromad"
          value={formatCurrency(data.summary.totalRevenue)}
          color="text-[var(--color-success)]"
          bg="bg-[var(--color-success-bg)]"
        />
        <StatCard
          label="Jami xarajat"
          value={formatCurrency(data.summary.totalExpenses)}
          color="text-[var(--color-danger)]"
          bg="bg-[var(--color-danger-bg)]"
        />
        <StatCard
          label="Sof foyda"
          value={formatCurrency(data.summary.netProfit)}
          color={data.summary.netProfit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}
          bg={data.summary.netProfit >= 0 ? 'bg-[var(--color-success-bg)]' : 'bg-[var(--color-danger-bg)]'}
        />
        <StatCard
          label="Foyda foizi"
          value={`${data.summary.profitMargin}%`}
          color="text-[var(--color-accent-primary)]"
          bg="bg-[var(--color-accent-subtle)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.monthlySales?.length > 0 && (
          <Card>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm">
              Oylik sotuv tendentsiyasi
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis
                  tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="total" fill="var(--color-accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm">
            Xarajatlar taqsimoti
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Ish haqi',  value: data.expenses.salary },
                  { name: 'Xom ashyo', value: data.expenses.waste  },
                ]}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {[0, 1].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={CHART_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-border-primary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Debitor qarz (biz olishimiz kerak)</p>
          <p className="text-2xl font-bold text-[var(--color-success)] tabular-nums">
            {formatCurrency(data.summary.receivableTotal)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-border-primary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Kreditor qarz (biz berishimiz kerak)</p>
          <p className="text-2xl font-bold text-[var(--color-danger)] tabular-nums">
            {formatCurrency(data.summary.payableTotal)}
          </p>
        </div>
      </div>

      {(data.topSales?.length ?? 0) > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-[var(--color-border-primary)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Eng yaxshi 10 ta sotuv</h3>
          </div>
          <div className="overflow-y-auto max-h-[240px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['#', 'Mijoz', 'Summa', 'Sana'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.topSales ?? []).map((sale: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-primary)]">{sale.contact}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold tabular-nums text-[var(--color-success)]">
                      {formatCurrency(sale.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                      {formatDate(sale.closedAt, 'short')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// OMBOR HISOBOTI
// ============================================
function WarehouseReport({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading, isError } = useWarehouseReport(filters)
  if (isError) return <div className="py-12 text-center text-sm text-danger">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      [
        { name: "Ombor qoldig'i",           data: data.stockItems    },
        { name: 'Kam qoldiq',               data: data.lowStockItems },
        { name: "Eng ko'p harakatlanganlar", data: data.topMovements  },
      ],
      `ombor-hisoboti-${filters.dateFrom}`
    )
  }

  if (isLoading) return <Skeleton height={300} className="rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet size={14} />}
          onClick={handleExportExcel}>
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami mahsulotlar" value={data.summary.totalProducts} />
        <StatCard
          label="Ombor qiymati"
          value={formatCurrency(data.summary.totalValue)}
          color="text-[var(--color-success)]"
          bg="bg-[var(--color-success-bg)]"
        />
        <StatCard
          label="Kam qoldiq"
          value={`${data.summary.lowStockCount} ta`}
          color={data.summary.lowStockCount > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}
          bg={data.summary.lowStockCount > 0 ? 'bg-[var(--color-danger-bg)]' : 'bg-[var(--color-bg-secondary)]'}
        />
        <StatCard
          label="Davrdagi chiqim"
          value={`${Number(data.summary.totalOut).toFixed(0)} dona`}
          color="text-[var(--color-warning)]"
          bg="bg-[var(--color-warning-bg)]"
        />
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-[var(--color-border-primary)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Eng ko'p sotilgan mahsulotlar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {['#', 'Mahsulot', 'Jami miqdor', 'Harakatlar'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.topMovements ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{item.productName}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{item.totalQty.toFixed(1)} {item.unit}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default" size="sm">{item.movementCount} ta</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(data.lowStockItems?.length ?? 0) > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-[var(--color-border-primary)] flex items-center gap-2">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Kam qoldiqli mahsulotlar</h3>
            <Badge variant="danger" size="sm">{data.lowStockItems.length} ta</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['Mahsulot', 'Hozirgi qoldiq', 'Min. qoldiq', 'Tanqislik'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.lowStockItems ?? []).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{item.name}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-danger)]">
                      {item.current.toFixed(1)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-text-secondary)]">
                      {item.minStock.toFixed(1)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums font-semibold text-[var(--color-danger)]">
                      -{item.deficit.toFixed(1)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// SAVDO HISOBOTI
// ============================================
function SalesReport({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading, isError } = useSalesReport(filters)
  if (isError) return <div className="py-12 text-center text-sm text-danger">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      [
        { name: 'Savdo hisoboti',      data: data.deals     },
        { name: "Mijozlar bo'yicha",   data: data.byContact },
        { name: "Mahsulotlar bo'yicha", data: data.byProduct },
      ],
      `savdo-hisoboti-${filters.dateFrom}`
    )
  }

  if (isLoading) return <Skeleton height={300} className="rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet size={14} />}
          onClick={handleExportExcel}>
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Jami sotuv"
          value={formatCurrency(data.summary.totalRevenue)}
          color="text-[var(--color-success)]"
          bg="bg-[var(--color-success-bg)]"
        />
        <StatCard label="Deallar soni" value={data.summary.dealsCount} />
        <StatCard
          label="O'rtacha deal"
          value={formatCurrency(data.summary.avgDealSize)}
          color="text-[var(--color-accent-primary)]"
          bg="bg-[var(--color-accent-subtle)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="none">
          <div className="p-4 border-b border-[var(--color-border-primary)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Mijozlar bo'yicha sotuv</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {['#', 'Mijoz', 'Jami sotuv', 'Deallar'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.byContact ?? []).map((c: any, i: number) => (
                <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{c.name}</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-medium text-[var(--color-success)]">
                    {formatCurrency(c.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default" size="sm">{c.count} ta</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card padding="none">
          <div className="p-4 border-b border-[var(--color-border-primary)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Mahsulotlar bo'yicha sotuv</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {['#', 'Mahsulot', 'Jami sotuv', 'Miqdor'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.byProduct ?? []).map((p: any, i: number) => (
                <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{p.name}</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-medium text-[var(--color-success)]">
                    {formatCurrency(p.total)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-text-secondary)]">
                    {Number(p.qty).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// XODIMLAR HISOBOTI
// ============================================
function EmployeesReport({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading, isError } = useEmployeesReport(filters)
  if (isError) return <div className="py-12 text-center text-sm text-danger">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      [{ name: 'Xodimlar', data: data.employees }],
      `xodimlar-hisoboti-${filters.dateFrom}`
    )
  }

  if (isLoading) return <Skeleton height={300} className="rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet size={14} />}
          onClick={handleExportExcel}>
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami xodimlar" value={data.summary.totalEmployees} />
        <StatCard
          label="Jami xarajat"
          value={formatCurrency(data.summary.totalExpenses)}
          color="text-[var(--color-danger)]"
          bg="bg-[var(--color-danger-bg)]"
        />
        <StatCard
          label="To'langan"
          value={formatCurrency(data.summary.totalPaid)}
          color="text-[var(--color-success)]"
          bg="bg-[var(--color-success-bg)]"
        />
        <StatCard
          label="To'lanmagan"
          value={formatCurrency(data.summary.totalUnpaid)}
          color={data.summary.totalUnpaid > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}
          bg={data.summary.totalUnpaid > 0 ? 'bg-[var(--color-warning-bg)]' : 'bg-[var(--color-bg-secondary)]'}
        />
      </div>

      {(data.byDepartment?.length ?? 0) > 0 && (
        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm">
            Bo'limlar bo'yicha ish haqi xarajati
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis
                tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              />
              <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="var(--color-accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {['Xodim', 'Lavozim', "Bo'lim", 'Tur', "To'lash kerak", "To'langan", 'Qoldi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.employees ?? []).map((emp: any) => (
                <tr key={emp.id} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{emp.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{emp.position || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{emp.department || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={emp.employeeType === 'PERMANENT' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {emp.employeeType === 'PERMANENT' ? 'Doimiy'
                       : emp.employeeType === 'DAILY' ? 'Kunlik' : 'Shartnoma'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatCurrency(emp.totalDue)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-success)]">
                    {formatCurrency(emp.totalPaid)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums font-medium">
                    <span className={emp.unpaid > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}>
                      {emp.unpaid > 0 ? formatCurrency(emp.unpaid) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)]/50">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] text-right">
                  Jami:
                </td>
                <td className="px-4 py-3 text-sm font-bold tabular-nums">
                  {formatCurrency(data.summary.totalExpenses)}
                </td>
                <td className="px-4 py-3 text-sm font-bold tabular-nums text-[var(--color-success)]">
                  {formatCurrency(data.summary.totalPaid)}
                </td>
                <td className="px-4 py-3 text-sm font-bold tabular-nums text-[var(--color-danger)]">
                  {data.summary.totalUnpaid > 0 ? formatCurrency(data.summary.totalUnpaid) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ============================================
// CHIQINDI HISOBOTI
// ============================================
function WasteReport({ filters }: { filters: { dateFrom: string; dateTo: string } }) {
  const { data, isLoading, isError } = useWasteReport(filters)
  if (isError) return <div className="py-12 text-center text-sm text-danger">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      [{ name: 'Chiqindi hisoboti', data: data.batches }],
      `chiqindi-hisoboti-${filters.dateFrom}`
    )
  }

  if (isLoading) return <Skeleton height={300} className="rounded-lg" />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet size={14} />}
          onClick={handleExportExcel}>
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami partiyalar" value={data.summary.totalBatches} />
        <StatCard
          label="Kirdi (kg)"
          value={formatWeight(data.summary.totalInput)}
          color="text-[var(--color-accent-primary)]"
          bg="bg-[var(--color-accent-subtle)]"
        />
        <StatCard
          label="Samaradorlik"
          value={`${data.summary.efficiency}%`}
          color="text-[var(--color-success)]"
          bg="bg-[var(--color-success-bg)]"
        />
        <StatCard
          label="Anomaliyalar"
          value={`${data.summary.anomaliesCount} ta`}
          color={data.summary.anomaliesCount > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}
          bg={data.summary.anomaliesCount > 0 ? 'bg-[var(--color-danger-bg)]' : 'bg-[var(--color-bg-secondary)]'}
        />
      </div>

      {(data.byQuality?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm">
              Sifat turi bo'yicha taqsimot
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(data.byQuality ?? []).map((q: any) => ({ name: q.name, value: q.totalWeight }))}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(data.byQuality ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => `${Number(v).toFixed(1)} kg`}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card padding="none">
            <div className="p-4 border-b border-[var(--color-border-primary)]">
              <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Sifat turlari statistikasi</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['Sifat', 'Partiyalar', 'Jami vazn', 'Xarajat'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.byQuality ?? []).map((q: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: q.color }} />
                        {q.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{q.count}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatWeight(q.totalWeight)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-danger)]">
                      {formatCurrency(q.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {data.batches.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-[var(--color-border-primary)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">So'nggi partiyalar</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['Partiya', 'Sifat', 'Kirdi (kg)', 'Xarajat', 'Sana', 'Holat'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.batches ?? []).map((b: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-tertiary)]/30">
                    <td className="px-4 py-3 text-sm font-mono text-[var(--color-accent-primary)]">{b.batchNumber}</td>
                    <td className="px-4 py-3 text-sm">{b.qualityType}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{b.inputWeight.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-danger)]">
                      {formatCurrency(b.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDate(b.receivedAt, 'short')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={b.status === 'PROCESSED' ? 'success' : b.status === 'IN_STOCK' ? 'primary' : 'default'}
                        size="sm"
                      >
                        {b.status === 'IN_STOCK'    ? 'Omborda'
                         : b.status === 'PROCESSED' ? 'Qayta ishlangan'
                         : b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// QURILISH HISOBOTI
// ============================================
function ConstructionReport({ filters }: { filters: any }) {
  const { data, isLoading } = useConstructionReport(filters)
  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

  if (isLoading) return <div className="text-center py-8 text-[var(--color-text-muted)]">Yuklanmoqda...</div>
  if (!data) return null

  const { summary } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jami loyihalar',  value: String(summary.totalProjects),   color: '' },
          { label: 'Aktiv',           value: String(summary.activeProjects),   color: 'text-[var(--color-accent-primary)]' },
          { label: 'Muddati o\'tgan', value: String(summary.overdueProjects),  color: summary.overdueProjects > 0 ? 'text-[var(--color-danger)]' : '' },
          { label: 'Tugallangan',     value: String(summary.completedProjects), color: 'text-[var(--color-success)]' },
        ].map(c => (
          <Card key={c.label} padding="sm">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{c.label}</p>
            <p className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Umumiy byudjet</p>
          <p className="text-xl font-bold tabular-nums text-[var(--color-accent-primary)]">{fmt(summary.totalBudget)} so'm</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Xarajatlar</p>
          <p className={`text-xl font-bold tabular-nums ${summary.totalExpense > summary.totalBudget ? 'text-[var(--color-danger)]' : ''}`}>
            {fmt(summary.totalExpense)} so'm
          </p>
        </Card>
      </div>

      {data.projects.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Loyihalar</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-tertiary)]">
              <tr>
                {['Loyiha', 'Holat', 'Byudjet', 'Vazifalar', 'Jurnallar'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p: any) => (
                <tr key={p.id} className={`border-t border-[var(--color-border-primary)] ${p.isOverdue ? 'bg-[var(--color-danger)]/5' : ''}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'COMPLETED' ? 'success' : p.isOverdue ? 'danger' : 'info'} size="sm">{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{fmt(p.budget)}</td>
                  <td className="px-4 py-3">{p.tasks}</td>
                  <td className="px-4 py-3">{p.workLogs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

// ============================================
// ISHLAB CHIQARISH HISOBOTI
// ============================================
function ProductionReport({ filters }: { filters: any }) {
  const { data, isLoading } = useProductionReport(filters)
  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

  if (isLoading) return <div className="text-center py-8 text-[var(--color-text-muted)]">Yuklanmoqda...</div>
  if (!data) return null

  const { summary } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jami partiyalar',    value: String(summary.totalBatches), color: '' },
          { label: 'Jarayonda',          value: String(summary.inProgress),   color: 'text-[var(--color-accent-primary)]' },
          { label: 'Yakunlangan',        value: String(summary.completed),    color: 'text-[var(--color-success)]' },
          { label: 'Muvaffaqiyat daraj.', value: `${summary.successRate}%`,   color: summary.successRate >= 80 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]' },
        ].map(c => (
          <Card key={c.label} padding="sm">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{c.label}</p>
            <p className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {data.outputByProduct.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Mahsulot chiqimi</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-tertiary)]">
              <tr>
                {['Mahsulot', 'Miqdor'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.outputByProduct.map((p: any, i: number) => (
                <tr key={i} className="border-t border-[var(--color-border-primary)]">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums">{p.qty.toFixed(2)} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data.batches.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Partiyalar</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-tertiary)]">
              <tr>
                {['#', 'Retsept', 'Holat', 'Qo\'shimcha xarajat'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.batches.map((b: any) => (
                <tr key={b.id} className="border-t border-[var(--color-border-primary)]">
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">#{b.batchNumber}</td>
                  <td className="px-4 py-3 font-medium">{b.formula}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === 'COMPLETED' ? 'success' : b.status === 'CANCELLED' ? 'danger' : 'info'} size="sm">{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{fmt(b.overhead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
type TabId = 'financial' | 'warehouse' | 'sales' | 'employees' | 'waste' | 'construction' | 'production'

const TABS: { id: TabId; label: string; Icon: typeof TrendingUp }[] = [
  { id: 'financial',    label: 'Moliyaviy',      Icon: TrendingUp },
  { id: 'warehouse',    label: 'Ombor',          Icon: Package    },
  { id: 'sales',        label: 'Savdo',          Icon: TrendingUp },
  { id: 'employees',    label: 'Xodimlar',       Icon: Users      },
  { id: 'waste',        label: 'Chiqindi',       Icon: Recycle    },
  { id: 'construction', label: 'Qurilish',       Icon: HardHat    },
  { id: 'production',   label: 'Ishlab chiqarish', Icon: Factory  },
]

export default function ReportsPage() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<TabId>('financial')
  const [filters, setFilters]     = useState(() => getDateRange(QUICK_PERIODS[0]))

  return (
    <div>
      <PageHeader
        title={t('nav.reports')}
        description={t('reports.description')}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Hisobotlar' },
        ]}
      />

      <Card padding="sm" className="mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)] shrink-0">Davr:</span>
          <PeriodSelector filters={filters} onChange={setFilters} />
        </div>
      </Card>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-[var(--color-accent-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]'
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div>
        {activeTab === 'financial'    && <FinancialReport    filters={filters} />}
        {activeTab === 'warehouse'    && <WarehouseReport    filters={filters} />}
        {activeTab === 'sales'        && <SalesReport        filters={filters} />}
        {activeTab === 'employees'    && <EmployeesReport    filters={filters} />}
        {activeTab === 'waste'        && <WasteReport        filters={filters} />}
        {activeTab === 'construction' && <ConstructionReport filters={filters} />}
        {activeTab === 'production'   && <ProductionReport   filters={filters} />}
      </div>
    </div>
  )
}
