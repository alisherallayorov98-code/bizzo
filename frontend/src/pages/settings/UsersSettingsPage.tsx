import { useState } from 'react'
import {
  UserPlus, ToggleLeft, ToggleRight,
  Mail, Phone, Calendar,
} from 'lucide-react'
import { Button }   from '@components/ui/Button/Button'
import { Input }    from '@components/ui/Input/Input'
import { Badge }    from '@components/ui/Badge/Badge'
import { Modal }    from '@components/ui/Modal/Modal'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import {
  useUsers, useCreateUser, useToggleUser,
} from '@features/settings/hooks/useSettings'
import { UserSetting } from '@services/settings.service'
import { formatDate } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

const ROLES = [
  { value: 'ADMIN',       label: 'Administrator', color: 'danger'  as const },
  { value: 'MANAGER',     label: 'Menejer',        color: 'primary' as const },
  { value: 'ACCOUNTANT',  label: 'Buxgalter',      color: 'info'    as const },
  { value: 'STOREKEEPER', label: 'Omborchi',        color: 'warning' as const },
  { value: 'SALESPERSON', label: 'Sotuvchi',        color: 'success' as const },
  { value: 'EMPLOYEE',    label: 'Xodim',           color: 'default' as const },
]

function getRoleCfg(role: string) {
  return ROLES.find(r => r.value === role) || { label: role, color: 'default' as const }
}

// ============================================
// YANGI FOYDALANUVCHI MODALI
// ============================================
function NewUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    phone: '', role: 'EMPLOYEE',
  })
  const createUser = useCreateUser()

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) return
    await createUser.mutateAsync(form)
    onClose()
    setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'EMPLOYEE' })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('settings.newUser')}
      description={t('settings.usersSubtitle')}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary" size="sm"
            loading={createUser.isPending}
            onClick={handleSubmit}
            disabled={!form.email || !form.password || !form.firstName || !form.lastName}
          >
            {t('common.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`${t('employees.firstName')} *`}
            placeholder="Alisher"
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
          />
          <Input
            label={`${t('employees.lastName')} *`}
            placeholder="Toshmatov"
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
          />
        </div>

        <Input
          label={`${t('common.email')} *`}
          type="email"
          placeholder="alisher@company.uz"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />

        <Input
          label={`${t('auth.password')} *`}
          type="password"
          placeholder={t('settings.min8chars')}
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />

        <Input
          label={t('common.phone')}
          placeholder="+998 90 123 45 67"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Rol</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(role => (
              <button
                key={role.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: role.value }))}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-medium border transition-all text-center',
                  form.role === role.value
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
                    : 'border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
                )}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function UsersSettingsPage() {
  const t = useT()
  const [newUserModal, setNewUserModal] = useState(false)
  const { data: users, isLoading } = useUsers()
  const toggleUser = useToggleUser()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-[var(--color-text-primary)] text-lg">
            {t('settings.users')}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {t('settings.usersSubtitle')}
          </p>
        </div>
        <Button
          variant="primary" size="sm"
          leftIcon={<UserPlus size={14} />}
          onClick={() => setNewUserModal(true)}
        >
          {t('common.add')}
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
            >
              <Skeleton height={16} width="40%" className="mb-2" />
              <Skeleton height={12} width="60%" />
            </div>
          ))
        ) : (
          users?.map((user: UserSetting) => {
            const roleCfg = getRoleCfg(user.role)
            return (
              <div
                key={user.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border transition-all',
                  user.isActive
                    ? 'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)]'
                    : 'bg-[var(--color-bg-tertiary)]/50 border-[var(--color-border-primary)] opacity-60'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  user.isActive
                    ? 'bg-[var(--color-accent-primary)]/20 border border-[var(--color-accent-primary)]/30'
                    : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]'
                )}>
                  <span className="text-xs font-bold text-[var(--color-accent-primary)]">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>

                {/* Ma'lumotlar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {user.firstName} {user.lastName}
                    </p>
                    <Badge variant={roleCfg.color} size="sm">
                      {roleCfg.label}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="default" size="sm">{t('settings.blocked')}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Mail size={10} />
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Phone size={10} />
                        {user.phone}
                      </span>
                    )}
                    {user.lastLoginAt && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Calendar size={10} />
                        {formatDate(user.lastLoginAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleUser.mutate(user.id)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors shrink-0',
                    user.isActive
                      ? 'text-[var(--color-success)] hover:bg-[var(--color-success-bg)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                  title={user.isActive ? 'Bloklash' : 'Faollashtirish'}
                >
                  {user.isActive
                    ? <ToggleRight size={18} />
                    : <ToggleLeft  size={18} />
                  }
                </button>
              </div>
            )
          })
        )}
      </div>

      <NewUserModal open={newUserModal} onClose={() => setNewUserModal(false)} />
    </div>
  )
}
