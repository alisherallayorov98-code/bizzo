import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Play, Square, FileText, TrendingUp,
  ShoppingBag, CreditCard, Wallet, Banknote, ArrowLeft, Printer,
} from 'lucide-react'
import api from '@config/api'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Badge }      from '@components/ui/Badge/Badge'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn }         from '@utils/cn'
import toast          from 'react-hot-toast'

const PM_LABELS: Record<string, { label: string; icon: typeof CreditCard }> = {
  CASH:     { label: 'Naqd',     icon: Banknote   },
  CARD:     { label: 'Karta',    icon: CreditCard  },
  TRANSFER: { label: "O'tkazma", icon: Wallet      },
  DEBT:     { label: 'Qarz',     icon: TrendingUp  },
}

interface ShiftReport {
  shiftId:           string
  totalSales:        number
  totalTransactions: number
  byPayment:         Array<{ paymentMethod: string; total: number; count: number }>
  topProducts:       Array<{ name: string; qty: number; total: number }>
  transactions:      any[]
}

function ShiftReportCard({ data }: { data: ShiftReport }) {
  return (
    <div className="space-y-4 print:text-black">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Jami savdo</p>
          <p className="text-xl font-bold text-emerald-500 tabular-nums">{formatCurrency(data.totalSales)}</p>
        </div>
        <div className="p-4 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Tranzaksiyalar</p>
          <p className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">{data.totalTransactions}</p>
        </div>
        <div className="p-4 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] col-span-2">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">To'lov usullari</p>
          <div className="flex flex-wrap gap-2">
            {data.byPayment.map(bp => {
              const pm = PM_LABELS[bp.paymentMethod] ?? { label: bp.paymentMethod, icon: Wallet }
              return (
                <div key={bp.paymentMethod} className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--color-text-muted)]">{pm.label}:</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(bp.total)}</span>
                  <span className="text-[var(--color-text-muted)]">({bp.count}ta)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {data.topProducts.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3 text-[var(--color-text-primary)]">Top mahsulotlar</p>
          <div className="space-y-1.5">
            {data.topProducts.map(p => (
              <div key={p.name} className="flex items-center justify-between text-sm py-1 border-b border-[var(--color-border-primary)] last:border-0">
                <span className="text-[var(--color-text-secondary)]">{p.name}</span>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-[var(--color-text-muted)] text-xs">{p.qty} dona</span>
                  <span className="font-medium tabular-nums">{formatCurrency(p.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function POSShiftPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [xReport,     setXReport]    = useState<ShiftReport | null>(null)

  const { data: currentShift, isLoading } = useQuery({
    queryKey: ['pos-shift', 'current'],
    queryFn:  () => api.get('/pos/shift/current').then(r => r.data.data ?? r.data),
    refetchInterval: 30_000,
  })

  const { data: shifts } = useQuery({
    queryKey: ['pos-shifts'],
    queryFn:  () => api.get('/pos/shifts').then(r => r.data.data ?? r.data),
  })

  const openMut = useMutation({
    mutationFn: () => api.post('/pos/shift/open', { openingCash }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-shift'] }); qc.invalidateQueries({ queryKey: ['pos-shifts'] }); toast.success('Smena ochildi') },
    onError:   () => toast.error('Xatolik'),
  })

  const closeMut = useMutation({
    mutationFn: () => api.post('/pos/shift/close', { closingCash }).then(r => r.data.data ?? r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pos-shift'] })
      qc.invalidateQueries({ queryKey: ['pos-shifts'] })
      setXReport(data)
      toast.success('Smena yopildi — Z-hisobot tayyor')
    },
    onError: () => toast.error('Xatolik'),
  })

  const xReportMut = useMutation({
    mutationFn: () => api.get('/pos/shift/x-report').then(r => r.data.data ?? r.data),
    onSuccess:  (data) => setXReport(data),
    onError:    () => toast.error('X-hisobot olishda xatolik'),
  })

  return (
    <div>
      <PageHeader
        title="Smena boshqaruvi"
        description="POS kassa smena va Z-hisobot"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'POS', path: '/pos' },
          { label: 'Smena' },
        ]}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/pos')}>
            Kassaga qaytish
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smena boshqaruvi */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-[var(--color-accent-primary)]" />
              <p className="font-semibold text-[var(--color-text-primary)]">Joriy smena</p>
            </div>

            {isLoading ? (
              <div className="h-20 rounded-lg animate-pulse bg-[var(--color-bg-tertiary)]" />
            ) : currentShift ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-400">Smena ochiq</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Ochildi: {formatDate(currentShift.openedAt)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Kassir: {currentShift.userName}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Yopilish naqdi (so'm)</label>
                    <input
                      type="number"
                      value={closingCash}
                      onChange={e => setClosingCash(Number(e.target.value))}
                      className="h-9 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
                    />
                  </div>
                  <Button
                    variant="danger" size="sm" fullWidth
                    leftIcon={<Square size={14} />}
                    loading={closeMut.isPending}
                    onClick={() => closeMut.mutate()}
                  >
                    Smena yopish (Z-hisobot)
                  </Button>
                  <Button
                    variant="outline" size="sm" fullWidth
                    leftIcon={<FileText size={14} />}
                    loading={xReportMut.isPending}
                    onClick={() => xReportMut.mutate()}
                  >
                    X-hisobot (joriy holat)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">
                  <p className="text-sm text-[var(--color-text-muted)] text-center">Ochiq smena yo'q</p>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Boshlang'ich naqd (so'm)</label>
                  <input
                    type="number"
                    value={openingCash}
                    onChange={e => setOpeningCash(Number(e.target.value))}
                    className="h-9 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
                  />
                </div>
                <Button
                  variant="primary" size="sm" fullWidth
                  leftIcon={<Play size={14} />}
                  loading={openMut.isPending}
                  onClick={() => openMut.mutate()}
                >
                  Smenani ochish
                </Button>
              </div>
            )}
          </Card>

          {/* Smena tarixi */}
          <Card>
            <p className="text-sm font-semibold mb-3 text-[var(--color-text-primary)]">Smena tarixi</p>
            <div className="space-y-2">
              {(shifts ?? []).slice(0, 10).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border-primary)] last:border-0">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{s.userName}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{formatDate(s.openedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums">{formatCurrency(Number(s.totalSales))}</p>
                    <Badge variant={s.closedAt ? 'default' : 'success'} size="sm">
                      {s.closedAt ? 'Yopildi' : 'Ochiq'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Hisobot */}
        <div className="lg:col-span-2">
          {xReport ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {closeMut.isSuccess ? 'Z-Hisobot' : 'X-Hisobot'}
                </p>
                <Button variant="ghost" size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
                  Chop etish
                </Button>
              </div>
              <ShiftReportCard data={xReport} />
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
                <FileText size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Hisobot uchun X yoki Z tugmasini bosing</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
