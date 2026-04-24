import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  Building2, Users, Puzzle, CreditCard,
  Shield, ChevronRight, Save, Link2, FileClock, PlayCircle,
} from 'lucide-react'
import { ImageUpload } from '@components/ui/ImageUpload/ImageUpload'
import { useOnboardingStore } from '@store/onboarding.store'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Input }      from '@components/ui/Input/Input'
import { cn }         from '@utils/cn'
import {
  useCompanySettings, useUpdateCompany,
} from '@features/settings/hooks/useSettings'
import UsersSettingsPage    from './UsersSettingsPage'
import ModulesSettingsPage  from './ModulesSettingsPage'
import PlanSettingsPage     from './PlanSettingsPage'
import SecuritySettingsPage from './SecuritySettingsPage'
import IntegrationsPage     from './IntegrationsPage'
import AuditPage            from './AuditPage'
import { useT } from '@i18n/index'

// ============================================
// MENYU
// ============================================
const SETTINGS_MENU = [
  { id: 'company',      labelKey: 'settings.company',      descKey: 'settings.companyDesc',      Icon: Building2,  path: '/settings' },
  { id: 'users',        labelKey: 'settings.users',        descKey: 'settings.usersDesc',        Icon: Users,      path: '/settings/users' },
  { id: 'modules',      labelKey: 'settings.modules',      descKey: 'settings.modulesDesc',      Icon: Puzzle,     path: '/settings/modules' },
  { id: 'plan',         labelKey: 'settings.plan',         descKey: 'settings.planDesc',         Icon: CreditCard, path: '/settings/plan' },
  { id: 'security',     labelKey: 'settings.security',     descKey: 'settings.securityDesc',     Icon: Shield,     path: '/settings/security' },
  { id: 'integrations', labelKey: 'settings.integrations', descKey: 'settings.integrationsDesc', Icon: Link2,      path: '/settings/integrations' },
  { id: 'audit',        labelKey: 'settings.audit',        descKey: 'settings.auditDesc',        Icon: FileClock,  path: '/settings/audit' },
]

// ============================================
// KOMPANIYA FORMI
// ============================================
function CompanyForm() {
  const t = useT()
  const { data: company, isLoading } = useCompanySettings()
  const update = useUpdateCompany()
  const [form, setForm] = useState({
    name:      '',
    legalName: '',
    stir:      '',
    address:   '',
    phone:     '',
    email:     '',
    currency:  'UZS',
    taxRegime: 'GENERAL',
    logo:      '',
  })

  useEffect(() => {
    if (company) {
      setForm({
        name:      company.name      || '',
        legalName: company.legalName || '',
        stir:      company.stir      || '',
        address:   company.address   || '',
        phone:     company.phone     || '',
        email:     company.email     || '',
        currency:  company.currency  || 'UZS',
        taxRegime: company.taxRegime || 'GENERAL',
        logo:      company.logo      || '',
      })
    }
  }, [company])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-16 bg-[var(--color-bg-tertiary)] rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Logo bloki */}
      <ImageUpload
        value={form.logo || null}
        onChange={url => setForm(f => ({ ...f, logo: url || '' }))}
        size="md"
        aspectRatio="square"
        label={t('settings.companyLogo')}
        hint="PNG yoki JPG, 5 MB gacha"
      />

      {/* Asosiy ma'lumotlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={`${t('settings.companyName')} *`}
          placeholder="Bizzo MChJ"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <Input
          label={t('settings.legalName')}
          placeholder="Bizzo Technologies MChJ"
          value={form.legalName}
          onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('settings.stir')}
          placeholder="123456789"
          value={form.stir}
          onChange={e => setForm(f => ({ ...f, stir: e.target.value }))}
        />
        <Input
          label={t('common.phone')}
          placeholder="+998 71 123 45 67"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />
      </div>

      <Input
        label={t('settings.address')}
        placeholder="Toshkent sh., Yunusobod t., 5-ko'cha, 12-uy"
        value={form.address}
        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
      />

      <Input
        label={t('common.email')}
        type="email"
        placeholder="info@company.uz"
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
      />

      {/* Valyuta va soliq */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {t('settings.mainCurrency')}
          </label>
          <select
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="h-9 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
          >
            <option value="UZS">O'zbek so'mi (UZS)</option>
            <option value="USD">AQSh dollari (USD)</option>
            <option value="EUR">Yevropa evro (EUR)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {t('settings.taxRegime')}
          </label>
          <select
            value={form.taxRegime}
            onChange={e => setForm(f => ({ ...f, taxRegime: e.target.value }))}
            className="h-9 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
          >
            <option value="GENERAL">Umumiy (QQS 12%)</option>
            <option value="SIMPLIFIED">Soddalashtirilgan</option>
            <option value="FIXED">Qat'iy to'lov</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <OnboardingRestartButton />
        <Button
          variant="primary" size="sm"
          leftIcon={<Save size={14} />}
          loading={update.isPending}
          onClick={() => update.mutate(form)}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

function OnboardingRestartButton() {
  const { resetOnboarding, startOnboarding } = useOnboardingStore()
  return (
    <Button
      variant="ghost" size="sm"
      leftIcon={<PlayCircle size={14} />}
      onClick={() => { resetOnboarding(); setTimeout(startOnboarding, 100) }}
      className="text-text-muted hover:text-text-primary"
    >
      Onboarding qayta o'tish
    </Button>
  )
}

// ============================================
// ASOSIY LAYOUT
// ============================================
export default function CompanySettingsPage() {
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()

  const activeId = SETTINGS_MENU.find(m =>
    m.path === '/settings'
      ? location.pathname === '/settings'
      : location.pathname.startsWith(m.path)
  )?.id || 'company'

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('settings.title') },
        ]}
      />

      <div className="flex gap-6">
        {/* Chap menyu */}
        <div className="w-56 shrink-0 hidden md:block">
          <Card padding="none">
            <nav className="p-2 space-y-0.5">
              {SETTINGS_MENU.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                    activeId === item.id
                      ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <item.Icon size={16} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t(item.labelKey)}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                      {t(item.descKey)}
                    </p>
                  </div>
                  {activeId === item.id && (
                    <ChevronRight size={12} className="shrink-0" />
                  )}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* O'ng kontent */}
        <div className="flex-1 min-w-0">
          <Card>
            <Routes>
              <Route index          element={<CompanyForm />}          />
              <Route path="users"    element={<UsersSettingsPage />}    />
              <Route path="modules"  element={<ModulesSettingsPage />}  />
              <Route path="plan"     element={<PlanSettingsPage />}     />
              <Route path="security"      element={<SecuritySettingsPage />} />
              <Route path="integrations" element={<IntegrationsPage />}     />
              <Route path="audit"        element={<AuditPage />}             />
            </Routes>
          </Card>
        </div>
      </div>
    </div>
  )
}
