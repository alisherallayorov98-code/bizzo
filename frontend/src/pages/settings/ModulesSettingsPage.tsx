import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Button }        from '@components/ui/Button/Button'
import { Badge }         from '@components/ui/Badge/Badge'
import { Modal, ConfirmDialog } from '@components/ui/Modal/Modal'
import { Skeleton }      from '@components/ui/Skeleton/Skeleton'
import { useModules, useActivateModule } from '@features/settings/hooks/useSettings'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService, ModuleInfo } from '@services/settings.service'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn } from '@utils/cn'
import toast from 'react-hot-toast'
import { useT } from '@i18n/index'

export default function ModulesSettingsPage() {
  const t = useT()
  const [activateModal,    setActivateModal]    = useState<ModuleInfo | null>(null)
  const [deactivateType,   setDeactivateType]   = useState<string | null>(null)
  const [months,           setMonths]           = useState(1)

  const { data: modules, isLoading } = useModules()
  const activateMutation = useActivateModule()
  const qc = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: settingsService.deactivateModule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['auth'] })
      toast.success("Modul o'chirildi")
      setDeactivateType(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('errors.serverError')),
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-lg">{t('settings.modules')}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {t('settings.modulesSubtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
            >
              <Skeleton height={20} width="40%" className="mb-2" />
              <Skeleton height={14} width="70%" />
            </div>
          ))
        ) : (
          modules?.map((mod: ModuleInfo) => (
            <div
              key={mod.type}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border transition-all',
                mod.isActive
                  ? 'bg-[var(--color-bg-secondary)] border-[var(--color-success)]/30'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)]'
              )}
            >
              {/* Rang indikatori */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ backgroundColor: mod.color }}
              >
                {mod.name.slice(0, 2).toUpperCase()}
              </div>

              {/* Ma'lumotlar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {mod.name}
                  </p>
                  {mod.isActive ? (
                    <Badge variant="success" size="sm" dot>{t('settings.connected')}</Badge>
                  ) : (
                    <Badge variant="default" size="sm">{t('settings.disabled')}</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">
                  {mod.description}
                </p>

                {mod.isActive && mod.moduleData?.expiresAt && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Clock size={11} />
                    <span>
                      Muddati: {formatDate(mod.moduleData.expiresAt)}
                      {new Date(mod.moduleData.expiresAt) <
                        new Date(Date.now() + 7 * 86_400_000) && (
                        <span className="text-[var(--color-warning)] ml-1">
                          (tez tugaydi)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Narx va tugma */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(mod.price)}
                  <span className="text-xs text-[var(--color-text-muted)]">/oy</span>
                </p>
                {mod.isActive ? (
                  <Button
                    variant="danger" size="xs"
                    leftIcon={<Trash2 size={11} />}
                    onClick={() => setDeactivateType(mod.type)}
                  >
                    O'chirish
                  </Button>
                ) : (
                  <Button
                    variant="success" size="xs"
                    leftIcon={<Plus size={11} />}
                    onClick={() => { setActivateModal(mod); setMonths(1) }}
                  >
                    Ulash
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modul ulash modali */}
      <Modal
        open={!!activateModal}
        onClose={() => setActivateModal(null)}
        title={`${activateModal?.name} modulini ulash`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setActivateModal(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary" size="sm"
              loading={activateMutation.isPending}
              onClick={() => {
                if (!activateModal) return
                activateMutation.mutate({ type: activateModal.type, months })
                setActivateModal(null)
              }}
            >
              Ulash
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: activateModal?.color }}
            >
              {activateModal?.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {activateModal?.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {activateModal?.description}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Muddat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 12].map(m => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-medium border transition-all text-center',
                    months === m
                      ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
                      : 'border-[var(--color-border-primary)] text-[var(--color-text-secondary)]'
                  )}
                >
                  {m === 1 ? '1 oy' : m === 3 ? '3 oy' : '1 yil'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">
                {activateModal?.name} x {months} oy
              </span>
              <span className="font-bold text-[var(--color-success)]">
                {formatCurrency((activateModal?.price || 0) * months)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* O'chirish tasdiqi */}
      <ConfirmDialog
        open={!!deactivateType}
        onClose={() => setDeactivateType(null)}
        onConfirm={() => deactivateMutation.mutate(deactivateType!)}
        title={t('settings.disableModule')}
        description={t('settings.disableModuleDesc')}
        confirmText={t('common.delete')}
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
