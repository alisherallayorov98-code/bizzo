import { useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@utils/cn'
import { TopNavBar } from '../TopNavBar/TopNavBar'
import { BottomNav } from '../BottomNav/BottomNav'
import { useMobile, usePullToRefresh, usePWAInstall } from '@hooks/useMobile'
import { OnboardingWizard } from '@components/onboarding/OnboardingWizard'
import { HelpCenter } from '@components/shared/HelpCenter/HelpCenter'
import { useOnboardingStore } from '@store/onboarding.store'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { billingService } from '@services/billing.service'

function SubscriptionBanner() {
  const navigate = useNavigate()
  const { data: sub } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  () => billingService.getSubscription(),
    staleTime: 5 * 60 * 1000,
  })
  if (!sub || sub.status === 'ACTIVE' || sub.status === 'TRIALING') return null
  const isExpired  = sub.status === 'EXPIRED'  || sub.status === 'CANCELED'
  const isPastDue  = sub.status === 'PAST_DUE'
  if (!isExpired && !isPastDue) return null

  return (
    <div className={cn(
      'fixed top-[var(--header-height)] left-0 right-0 z-20',
      'py-2 px-4 flex items-center justify-center gap-2 text-xs font-medium text-white',
      isExpired ? 'bg-danger/90 backdrop-blur-sm' : 'bg-warning/90 backdrop-blur-sm',
    )}>
      <AlertTriangle size={12} />
      <span>
        {isExpired
          ? "Obuna muddati tugagan — xizmatlar cheklangan."
          : "To'lov muddati o'tdi — to'lovni amalga oshiring."}
      </span>
      <button onClick={() => navigate('/billing')}
        className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors">
        Obunani yangilash →
      </button>
    </div>
  )
}

function OfflineBanner() {
  const { isOnline } = useMobile()
  if (isOnline) return null
  return (
    <div
      className={cn(
        'fixed top-[var(--header-height)] left-0 right-0 z-20',
        'bg-[var(--color-warning)]/90 backdrop-blur-sm',
        'py-2 px-4 flex items-center justify-center gap-2',
        'text-xs font-medium text-white',
      )}
    >
      <WifiOff size={12} />
      <span>Internet aloqasi yo'q — oxirgi ma'lumotlar ko'rsatilmoqda</span>
    </div>
  )
}

function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall()
  if (!canInstall) return null
  return (
    <div
      className={cn(
        'fixed left-4 right-4 z-20',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-accent-primary)]/30',
        'rounded-xl p-3 shadow-lg flex items-center gap-3',
      )}
      style={{
        bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 8px)',
      }}
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-purple-500 flex items-center justify-center text-white font-black text-lg shrink-0">
        B
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Bizzo'ni o'rnating</p>
        <p className="text-xs text-[var(--color-text-muted)]">Tezroq ishlash uchun ilovaga qo'shing</p>
      </div>
      <button
        onClick={install}
        className="px-3 py-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white text-xs font-medium shrink-0"
      >
        O'rnatish
      </button>
    </div>
  )
}

export function AppLayout() {
  const { isMobile } = useMobile()
  const qc          = useQueryClient()

  const handleRefresh = useCallback(async () => {
    await qc.invalidateQueries()
  }, [qc])

  const { isRefreshing, pullDistance } = usePullToRefresh(handleRefresh)

  const user            = useAuthStore(s => s.user)
  const startOnboarding = useOnboardingStore(s => s.startOnboarding)
  const isCompleted     = useOnboardingStore(s => s.isCompleted)
  const isDismissed     = useOnboardingStore(s => s.isDismissed)

  useEffect(() => {
    if (!user || isCompleted || isDismissed) return
    const key = `bizzo-onboarding-seen-${user.id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    const t = setTimeout(() => startOnboarding(), 1000)
    return () => clearTimeout(t)
  }, [user, isCompleted, isDismissed, startOnboarding])

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopNavBar />

      <div className="flex flex-col min-h-screen">
        <SubscriptionBanner />
        <OfflineBanner />

        {isMobile && (
          <div className={cn(
            'pull-to-refresh',
            (pullDistance > 40 || isRefreshing) && 'visible',
          )}>
            <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
            <span>{isRefreshing ? 'Yangilanmoqda...' : 'Yangilash uchun torting'}</span>
          </div>
        )}

        <main
          className={cn(
            'flex-1 mt-[var(--header-height)]',
            'p-[var(--page-padding)]',
            isMobile && 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+24px)]',
          )}
        >
          <div className="max-w-[1600px] mx-auto animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
      {isMobile && <PWAInstallBanner />}

      <HelpCenter />
      <OnboardingWizard />
    </div>
  )
}

export default AppLayout
