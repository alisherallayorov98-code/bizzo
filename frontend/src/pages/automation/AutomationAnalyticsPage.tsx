import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle, XCircle, Zap, TrendingUp, BarChart3 } from 'lucide-react'
import api from '@/config/api'

const TRIGGER_LABELS: Record<string, string> = {
  INVOICE_OVERDUE:    'Invoice muddati o\'tdi',
  INVOICE_DUE_SOON:   'Invoice muddati yaqin',
  DEBT_OVERDUE:       'Qarz muddati o\'tdi',
  PAYMENT_RECEIVED:   'To\'lov qabul qilindi',
  STOCK_LOW:          'Ombor zaxirasi kam',
  STOCK_MOVEMENT:     'Ombor harakati',
  PURCHASE_RECEIVED:  'Xarid qabul qilindi',
  DEAL_WON:           'Bitim yutildi',
  DEAL_STAGE_CHANGED: 'Bitim bosqichi',
  DEAL_STALE:         'Harakatsiz bitim',
  QUOTATION_APPROVED: 'Taklifnoma tasdiqlandi',
  QUOTATION_EXPIRED:  'Taklifnoma muddati',
  CONTRACT_EXPIRING:  'Shartnoma tugayapti',
  CONTACT_CREATED:    'Yangi kontragent',
  CUSTOMER_INACTIVE:  'Faol bo\'lmagan mijoz',
  SALARY_DUE:         'Ish haqi vaqti',
  DAILY_MORNING:      'Har kuni 09:00',
  WEEKLY_MONDAY:      'Har dushanba',
  MONTHLY_FIRST:      'Har oyning 1-kuni',
  WEBHOOK_INBOUND:    'Kiruvchi webhook',
  MANUAL:             'Qo\'lda',
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ComponentType<any>; color: string
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

export default function AutomationAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-analytics'],
    queryFn:  () => api.get('/automation/analytics').then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--color-bg-secondary)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const s = data?.summary ?? {}
  const maxCount = Math.max(...(data?.last7days ?? []).map((d: any) => d.count), 1)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Avtomatlashtirish analitikasi</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">So'nggi natijalar va statistika</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Jami qoidalar"    value={s.totalRules  ?? 0} icon={Zap}          color="bg-blue-500/15 text-blue-400"    />
        <KpiCard label="Faol qoidalar"    value={s.activeRules ?? 0} icon={Activity}      color="bg-green-500/15 text-green-400"  />
        <KpiCard label="Jami bajarildi"   value={s.totalLogs   ?? 0} icon={BarChart3}     color="bg-purple-500/15 text-purple-400"/>
        <KpiCard label="Muvaffaqiyatli"   value={s.successLogs ?? 0} icon={CheckCircle}   color="bg-green-500/15 text-green-400"  />
        <KpiCard label="Muvaffaqiyatsiz"  value={s.failedLogs  ?? 0} icon={XCircle}       color="bg-red-500/15 text-red-400"      />
        <KpiCard
          label="Muvaffaqiyat %"
          value={`${s.successRate ?? 0}%`}
          icon={TrendingUp}
          color="bg-cyan-500/15 text-cyan-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 7 days chart */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">So'nggi 7 kun</h2>
          {(data?.last7days ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Ma'lumot yo'q</p>
          ) : (
            <div className="space-y-3">
              {(data?.last7days ?? []).map((d: any) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-muted)] w-20 shrink-0">{d.date?.slice(5)}</span>
                  <div className="flex-1 flex gap-1 h-5">
                    <div
                      className="bg-[var(--color-success)]/70 rounded-sm"
                      style={{ width: `${(d.success / maxCount) * 100}%`, minWidth: d.success > 0 ? 4 : 0 }}
                      title={`Muvaffaqiyatli: ${d.success}`}
                    />
                    <div
                      className="bg-[var(--color-danger)]/70 rounded-sm"
                      style={{ width: `${(d.failed / maxCount) * 100}%`, minWidth: d.failed > 0 ? 4 : 0 }}
                      title={`Xato: ${d.failed}`}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-8 text-right">{d.count}</span>
                </div>
              ))}
              <div className="flex gap-4 pt-2 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--color-success)]/70 inline-block" /> Muvaffaqiyatli</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--color-danger)]/70 inline-block" /> Xato</span>
              </div>
            </div>
          )}
        </div>

        {/* Top rules */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Eng faol qoidalar</h2>
          {(data?.topRules ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Ma'lumot yo'q</p>
          ) : (
            <div className="space-y-3">
              {(data?.topRules ?? []).map((r: any, i: number) => (
                <div key={r.ruleId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--color-text-muted)] w-4">{i + 1}</span>
                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{r.ruleName}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By trigger */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Trigger bo'yicha taqsimot</h2>
        {(data?.byTrigger ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">Ma'lumot yo'q</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(data?.byTrigger ?? []).map((t: any) => (
              <div key={t.trigger}
                className="flex items-center justify-between bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2">
                <span className="text-xs text-[var(--color-text-secondary)] truncate">
                  {TRIGGER_LABELS[t.trigger] ?? t.trigger}
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-primary)] ml-2 shrink-0">{t.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
