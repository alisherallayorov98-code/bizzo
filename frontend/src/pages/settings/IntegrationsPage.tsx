import { useState } from 'react'
import {
  Settings2, Power, Send, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, Eye, EyeOff, MessageSquare, Bot, FileText,
} from 'lucide-react'
import { Button }   from '@components/ui/Button/Button'
import { Input }    from '@components/ui/Input/Input'
import { Badge }    from '@components/ui/Badge/Badge'
import { Modal }    from '@components/ui/Modal/Modal'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import {
  useIntegrations,
  useSaveIntegration,
  useToggleIntegration,
  useSendSms,
  useNotificationLogs,
  useIntegrationStats,
} from '@features/integrations/hooks/useIntegrations'
import { integrationsService, IntegrationDef } from '@services/integrations.service'
import { formatDate } from '@utils/formatters'
import { cn } from '@utils/cn'
import toast from 'react-hot-toast'
import { useT } from '@i18n/index'

// ============================================================
// ICON BY CATEGORY
// ============================================================
function IntegrationIcon({ type, color }: { type: string; color: string }) {
  const icons: Record<string, typeof MessageSquare> = {
    ESKIZ_SMS:    MessageSquare,
    TELEGRAM_BOT: Bot,
    DIDOX:        FileText,
  }
  const Icon = icons[type] || Settings2
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
    >
      <Icon size={18} style={{ color }} />
    </div>
  )
}

// ============================================================
// KONFIGURATSIYA FORMASI
// ============================================================
function ConfigModal({
  integration,
  onClose,
}: {
  integration: IntegrationDef
  onClose: () => void
}) {
  const [form, setForm]   = useState<Record<string, any>>(
    Object.fromEntries(
      integration.configFields.map(f => [
        f.key,
        integration.config[f.key] === '***masked***' ? '' : (integration.config[f.key] || ''),
      ])
    )
  )
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const saveMutation       = useSaveIntegration()

  const isTelegram = integration.type === 'TELEGRAM_BOT'
  const webhookUrl = isTelegram
    ? `${window.location.origin.replace(':5173', ':3000')}/integrations/telegram/webhook/YOUR_COMPANY_ID`
    : ''

  const handleSave = () => {
    saveMutation.mutate({
      type:     integration.type,
      config:   form,
      isActive: integration.isActive,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${integration.name} — sozlamalar`}
      description={integration.description}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            variant="primary" size="sm"
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {integration.configFields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              {field.label}
              {field.required && <span className="text-[var(--color-danger)] ml-1">*</span>}
            </label>
            {field.type === 'password' ? (
              <div className="relative">
                <input
                  type={shown[field.key] ? 'text' : 'password'}
                  value={form[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="h-9 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 pr-9 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  onClick={() => setShown(s => ({ ...s, [field.key]: !s[field.key] }))}
                >
                  {shown[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ) : (
              <Input
                placeholder={field.placeholder}
                value={form[field.key] || ''}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}

        {/* Telegram-specific settings */}
        {isTelegram && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Hisobot Chat ID</label>
              <Input
                placeholder="Hisobotlar yuborilsin (guruh yoki kanal ID)"
                value={form.reportChatId || ''}
                onChange={e => setForm(f => ({ ...f, reportChatId: e.target.value }))}
              />
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Bildirishnoma sozlamalari</p>
              {[
                { key: 'dailyReport', label: 'Har kuni soat 09:00 da hisobot' },
                { key: 'debtAlert', label: 'Muddati o\'tgan qarz eslatmasi' },
                { key: 'stockAlert', label: 'Ombor zaxirasi ogohlantirishi' },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  <div
                    onClick={() => setForm(f => ({ ...f, [item.key]: !f[item.key] }))}
                    className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
                    style={{ background: form[item.key] ? 'var(--color-accent-primary)' : 'var(--color-bg-elevated)' }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: form[item.key] ? '18px' : '2px' }} />
                  </div>
                </label>
              ))}
            </div>

            <div className="p-3 rounded-xl" style={{ background: '#0088CC12', border: '1px solid #0088CC30' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#0088CC' }}>Webhook URL (Telegram-ga qo'ying)</p>
              <code className="text-xs break-all" style={{ color: 'var(--color-text-muted)' }}>{webhookUrl}</code>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ============================================================
// SMS TEST MODALI
// ============================================================
function SmsTestModal({ onClose }: { onClose: () => void }) {
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('BiznesERP: Test xabari')
  const sendSms = useSendSms()

  return (
    <Modal
      open
      onClose={onClose}
      title="SMS test yuborish"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Yopish</Button>
          <Button
            variant="primary" size="sm"
            leftIcon={<Send size={13} />}
            loading={sendSms.isPending}
            onClick={() => sendSms.mutate({ phone, message })}
            disabled={!phone || !message}
          >
            Yuborish
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Telefon raqam"
          placeholder="+998901234567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Xabar</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// TELEGRAM TEST MODALI
// ============================================================
function TelegramTestModal({ onClose }: { onClose: () => void }) {
  const [chatId,  setChatId]  = useState('')
  const [message, setMessage] = useState('BiznesERP: Test xabari')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      const result = await integrationsService.testTelegram(chatId, message)
      if (result.success) toast.success('Telegram xabari yuborildi')
      else toast.error(result.error || 'Xatolik')
    } catch {
      toast.error('Yuborishda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Telegram test yuborish"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Yopish</Button>
          <Button
            variant="primary" size="sm"
            leftIcon={<Send size={13} />}
            loading={loading}
            onClick={handleSend}
            disabled={!chatId || !message}
          >
            Yuborish
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Chat ID yoki @kanal"
          placeholder="-100123456789 yoki @channel_name"
          value={chatId}
          onChange={e => setChatId(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Xabar</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// INTEGRATSIYA KARTASI
// ============================================================
function IntegrationCard({ integration }: { integration: IntegrationDef }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [configModal, setConfigModal]     = useState(false)
  const [smsTest,     setSmsTest]         = useState(false)
  const [telegramTest, setTelegramTest]   = useState(false)
  const toggleMutation = useToggleIntegration()

  return (
    <>
      <div
        className={cn(
          'rounded-lg border transition-all',
          integration.isActive
            ? 'bg-[var(--color-bg-secondary)] border-[var(--color-success)]/30'
            : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)]'
        )}
      >
        {/* Sarlavha qatori */}
        <div className="flex items-center gap-4 p-4">
          <IntegrationIcon type={integration.type} color={integration.color} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {integration.name}
              </p>
              {integration.isActive ? (
                <Badge variant="success" size="sm" dot>{t('settings.connected')}</Badge>
              ) : (
                <Badge variant="default" size="sm">{t('settings.disabled')}</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{integration.description}</p>
            {integration.lastSyncAt && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                <Clock size={9} />
                Oxirgi: {formatDate(integration.lastSyncAt)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary" size="xs"
              leftIcon={<Settings2 size={11} />}
              onClick={() => setConfigModal(true)}
            >
              Sozla
            </Button>
            <button
              onClick={() => toggleMutation.mutate(integration.type)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                integration.isActive
                  ? 'text-[var(--color-success)] hover:bg-[var(--color-success-bg)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
              )}
              title={integration.isActive ? "O'chirish" : 'Ulash'}
            >
              <Power size={15} />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Kengaytirilgan qism */}
        {expanded && (
          <div className="border-t border-[var(--color-border-primary)] px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {integration.type === 'ESKIZ_SMS' && (
                <Button
                  variant="secondary" size="xs"
                  leftIcon={<Send size={11} />}
                  onClick={() => setSmsTest(true)}
                  disabled={!integration.isActive}
                >
                  SMS yuborish
                </Button>
              )}
              {integration.type === 'TELEGRAM_BOT' && (
                <Button
                  variant="secondary" size="xs"
                  leftIcon={<Send size={11} />}
                  onClick={() => setTelegramTest(true)}
                  disabled={!integration.isActive}
                >
                  Test xabar
                </Button>
              )}
              {!integration.isActive && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Testni boshlash uchun avval integratsiyani ulang
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {configModal && (
        <ConfigModal integration={integration} onClose={() => setConfigModal(false)} />
      )}
      {smsTest     && <SmsTestModal     onClose={() => setSmsTest(false)} />}
      {telegramTest && <TelegramTestModal onClose={() => setTelegramTest(false)} />}
    </>
  )
}

// ============================================================
// LOGLAR JADVALI
// ============================================================
function LogsTable() {
  const [logType,   setLogType]   = useState<string>('')
  const [logStatus, setLogStatus] = useState<string>('')
  const { data, isLoading } = useNotificationLogs({
    type:   logType   || undefined,
    status: logStatus || undefined,
  })

  const statusConfig = (status: string) => {
    if (status === 'SENT')    return { icon: CheckCircle, color: 'var(--color-success)',  label: 'Yuborildi' }
    if (status === 'FAILED')  return { icon: XCircle,     color: 'var(--color-danger)',   label: 'Xatolik'   }
    return                           { icon: Clock,        color: 'var(--color-warning)', label: 'Kutmoqda'  }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select
          value={logType}
          onChange={e => setLogType(e.target.value)}
          className="h-8 text-xs rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none"
        >
          <option value="">Barcha turlar</option>
          <option value="SMS">SMS</option>
          <option value="TELEGRAM">Telegram</option>
        </select>
        <select
          value={logStatus}
          onChange={e => setLogStatus(e.target.value)}
          className="h-8 text-xs rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none"
        >
          <option value="">Barcha holat</option>
          <option value="SENT">Yuborildi</option>
          <option value="FAILED">Xatolik</option>
          <option value="PENDING">Kutmoqda</option>
        </select>
        {data?.total !== undefined && (
          <span className="text-xs text-[var(--color-text-muted)]">
            Jami: {data.total}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={48} className="rounded-lg" />
          ))
        ) : !data?.logs?.length ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
            Loglar mavjud emas
          </div>
        ) : (
          data.logs.map((log: import('@services/integrations.service').NotificationLog) => {
            const sc = statusConfig(log.status)
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
              >
                <sc.icon size={14} style={{ color: sc.color }} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={log.type === 'SMS' ? 'primary' : 'info'} size="sm">
                      {log.type}
                    </Badge>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {log.recipient}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                    {log.message}
                  </p>
                  {log.errorMsg && (
                    <p className="text-xs text-[var(--color-danger)] mt-0.5">{log.errorMsg}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================
// STATISTIKA KARTOCHKALARI
// ============================================================
function StatsCards() {
  const { data, isLoading } = useIntegrationStats()
  if (isLoading) return <Skeleton height={80} className="rounded-lg mb-6" />
  if (!data) return null

  const cards = [
    { label: 'SMS yuborildi',       value: data.sms?.sent      || 0, color: 'var(--color-success)' },
    { label: 'SMS xatolik',         value: data.sms?.failed    || 0, color: 'var(--color-danger)'  },
    { label: 'Telegram yuborildi',  value: data.telegram?.sent || 0, color: '#2CA5E0'               },
    { label: 'Telegram xatolik',    value: data.telegram?.failed || 0, color: 'var(--color-warning)' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-center"
        >
          <p className="text-lg font-bold tabular-nums" style={{ color: c.color }}>
            {c.value}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ASOSIY SAHIFA
// ============================================================
export default function IntegrationsPage() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<'list' | 'logs'>('list')
  const { data: integrations, isLoading } = useIntegrations()

  const tabs = [
    { id: 'list' as const, label: t('settings.integrations') },
    { id: 'logs' as const, label: t('settings.logs') },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-lg">
          {t('settings.integrations')}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {t('settings.integrationsSubtitle')}
        </p>
      </div>

      {/* Tab navigatsiya */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-bg-tertiary)] mb-5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          <StatsCards />

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={80} className="rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {integrations?.map(integration => (
                <IntegrationCard key={integration.type} integration={integration} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'logs' && <LogsTable />}
    </div>
  )
}
