import { CheckCircle, Zap } from 'lucide-react'
import { Button }   from '@components/ui/Button/Button'
import { Badge }    from '@components/ui/Badge/Badge'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import { usePlanInfo } from '@features/settings/hooks/useSettings'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

export default function PlanSettingsPage() {
  const t = useT()
  const { data, isLoading } = usePlanInfo()

  if (isLoading) return <Skeleton height={400} className="rounded-lg" />

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-lg">
          {t('settings.plan')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {t('settings.planSubtitle')}
        </p>
      </div>

      {/* Joriy reja */}
      <div className="p-4 rounded-lg bg-[var(--color-accent-subtle)] border border-[var(--color-accent-primary)]/30 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-[var(--color-accent-primary)] text-lg">
                {data?.current.name}
              </p>
              <Badge variant="primary" size="sm">{t('settings.current')}</Badge>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {data?.current.price > 0
                ? `${formatCurrency(data.current.price)}${t('settings.perMonth')}`
                : t('settings.free')}
            </p>
          </div>
          <Zap size={32} className="text-[var(--color-accent-primary)]" />
        </div>

        {/* Foydalanish statistikasi */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: t('settings.users'),  used: data?.usage.users,    max: data?.current.maxUsers },
            { label: t('nav.contacts'),    used: data?.usage.contacts, max: null                   },
            { label: t('nav.products'),    used: data?.usage.products, max: null                   },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">
                {stat.used ?? 0}
                {stat.max && stat.max > 0 && (
                  <span className="text-sm text-[var(--color-text-muted)]">/{stat.max}</span>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
              {stat.max && stat.max > 0 && (
                <div className="mt-1 h-1 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      ((stat.used || 0) / stat.max) > 0.8
                        ? 'bg-[var(--color-danger)]'
                        : 'bg-[var(--color-accent-primary)]'
                    )}
                    style={{
                      width: `${Math.min(100, ((stat.used || 0) / stat.max) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Barcha rejalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data?.allPlans &&
          Object.entries(data.allPlans).map(([key, plan]: [string, any]) => {
            const isCurrent = data.current.plan === key
            return (
              <div
                key={key}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isCurrent
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]'
                    : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-secondary)]'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)]">{plan.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {plan.price > 0
                        ? `${formatCurrency(plan.price)}${t('settings.perMonth')}`
                        : key === 'ENTERPRISE' ? t('settings.negotiate') : t('settings.free')}
                    </p>
                  </div>
                  {isCurrent && <Badge variant="primary" size="sm">{t('settings.current')}</Badge>}
                </div>

                <div className="space-y-1.5 mb-3">
                  {plan.features.map((f: string) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle
                        size={12}
                        className="text-[var(--color-success)] shrink-0"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">{f}</span>
                    </div>
                  ))}
                </div>

                {!isCurrent && (
                  <Button
                    variant={key === 'PRO' ? 'primary' : 'secondary'}
                    size="xs"
                    fullWidth
                  >
                    {key === 'ENTERPRISE' ? t('settings.contactUs') : t('settings.switch')}
                  </Button>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
