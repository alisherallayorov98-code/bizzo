import { useState } from 'react'
import { Eye, EyeOff, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@components/ui/Button/Button'
import { Input }  from '@components/ui/Input/Input'
import { useMutation } from '@tanstack/react-query'
import { settingsService } from '@services/settings.service'
import { cn } from '@utils/cn'
import toast from 'react-hot-toast'
import { useT } from '@i18n/index'

export default function SecuritySettingsPage() {
  const t = useT()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    oldPassword:     '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const changePwd = useMutation({
    mutationFn: () =>
      settingsService.changePassword(form.oldPassword, form.newPassword),
    onSuccess: () => {
      toast.success(t('settings.passwordChanged'))
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || t('errors.serverError')),
  })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.oldPassword)           errs.oldPassword = t('validation.required')
    if (form.newPassword.length < 8) errs.newPassword = t('settings.min8chars')
    if (form.newPassword !== form.confirmPassword)
      errs.confirmPassword = t('validation.passwordMismatch')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Parol kuchi: 0-4
  const strength =
    form.newPassword.length === 0 ? 0
    : form.newPassword.length < 6 ? 1
    : form.newPassword.length < 10 ? 2
    : /[A-Z]/.test(form.newPassword) && /[0-9]/.test(form.newPassword) ? 4 : 3

  const strengthLabels = ['', t('settings.strengthVeryWeak'), t('settings.strengthWeak'), t('settings.strengthGood'), t('settings.strengthStrong')]
  const strengthColors = [
    '', 'bg-[var(--color-danger)]', 'bg-[var(--color-warning)]',
    'bg-[var(--color-info)]', 'bg-[var(--color-success)]',
  ]
  const strengthTextColors = [
    '', 'text-[var(--color-danger)]', 'text-[var(--color-warning)]',
    'text-[var(--color-info)]', 'text-[var(--color-success)]',
  ]

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-lg flex items-center gap-2">
          <Shield size={20} className="text-[var(--color-accent-primary)]" />
          {t('settings.security')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {t('settings.securitySubtitle')}
        </p>
      </div>

      <div className="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t('settings.changePassword')}
        </h3>

        <Input
          label={t('settings.currentPassword')}
          type={showOld ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.oldPassword}
          value={form.oldPassword}
          onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))}
          rightElement={
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="h-7 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />

        <div className="space-y-1">
          <Input
            label={t('auth.newPassword')}
            type={showNew ? 'text' : 'password'}
            placeholder={t('settings.min8chars')}
            error={errors.newPassword}
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            rightElement={
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="h-7 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {form.newPassword.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      i <= strength
                        ? strengthColors[strength]
                        : 'bg-[var(--color-bg-elevated)]'
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {t('settings.passwordStrength')}:{' '}
                <span className={strengthTextColors[strength]}>
                  {strengthLabels[strength]}
                </span>
              </p>
            </div>
          )}
        </div>

        <Input
          label={t('settings.confirmNewPassword')}
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword}
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          rightElement={
            form.confirmPassword &&
            form.newPassword === form.confirmPassword ? (
              <CheckCircle size={14} className="text-[var(--color-success)] mr-2" />
            ) : null
          }
        />

        <Button
          variant="primary"
          size="sm"
          fullWidth
          loading={changePwd.isPending}
          onClick={() => { if (validate()) changePwd.mutate() }}
        >
          {t('settings.changePassword')}
        </Button>
      </div>
    </div>
  )
}
