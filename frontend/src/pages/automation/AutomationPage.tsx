import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automationService } from '@services/automation.service'
import { AutomationRuleModal } from '@features/automation/AutomationRuleModal'
import BlueprintGallery from './BlueprintGallery'
import type { AutomationRule } from '@/types/automation'
import toast from 'react-hot-toast'
import {
  Zap, Plus, Play, Pause, Trash2, Edit2, CheckCircle,
  XCircle, AlertCircle, Clock, Activity, TrendingUp, Settings2,
} from 'lucide-react'

const TRIGGER_LABELS: Record<string, string> = {
  INVOICE_OVERDUE:    'Hisob-faktura muddati o\'tdi',
  STOCK_LOW:          'Ombor zaxirasi kam',
  DEAL_WON:           'Bitim yutildi',
  DEAL_STAGE_CHANGED: 'Bitim bosqichi o\'zgardi',
  CONTRACT_EXPIRING:  'Shartnoma tugayapti',
  PAYMENT_RECEIVED:   'To\'lov qabul qilindi',
  DEBT_OVERDUE:       'Qarz muddati o\'tdi',
  CONTACT_CREATED:    'Yangi kontragent',
  SALARY_DUE:         'Ish haqi vaqti',
  STOCK_MOVEMENT:     'Ombor harakati',
  MANUAL:             'Qo\'lda ishga tushirish',
}

const ACTION_LABELS: Record<string, string> = {
  SEND_SMS:            'SMS',
  SEND_TELEGRAM:       'Telegram',
  SEND_EMAIL:          'Email',
  CREATE_NOTIFICATION: 'Bildirishnoma',
  CREATE_TASK:         'Vazifa',
  WEBHOOK:             'Webhook',
}

const TRIGGER_COLORS: Record<string, string> = {
  INVOICE_OVERDUE:   'var(--color-danger)',
  INVOICE_DUE_SOON:  'var(--color-warning)',
  STOCK_LOW:         'var(--color-warning)',
  DEAL_WON:          'var(--color-success)',
  CONTRACT_EXPIRING: 'var(--color-accent-secondary, #8B5CF6)',
  PAYMENT_RECEIVED:  'var(--color-accent-primary)',
  DEBT_OVERDUE:      'var(--color-danger)',
  CONTACT_CREATED:   'var(--color-info, #06B6D4)',
  CUSTOMER_INACTIVE: 'var(--color-warning)',
  SALARY_DUE:        'var(--color-warning)',
  STOCK_MOVEMENT:    'var(--color-text-muted)',
  MANUAL:            'var(--color-text-muted)',
  DEAL_STAGE_CHANGED:'var(--color-success)',
  DEAL_STALE:        'var(--color-danger)',
  WEBHOOK_INBOUND:   'var(--color-accent-primary)',
  DAILY_MORNING:     'var(--color-info, #06B6D4)',
  WEEKLY_MONDAY:     'var(--color-accent-primary)',
  MONTHLY_FIRST:     'var(--color-accent-primary)',
  QUOTATION_APPROVED:'var(--color-success)',
  QUOTATION_EXPIRED: 'var(--color-warning)',
  PURCHASE_RECEIVED: 'var(--color-accent-primary)',
}

function StatusBadge({ status }: { status: 'SUCCESS' | 'PARTIAL' | 'FAILED' }) {
  if (status === 'SUCCESS') return (
    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
      <CheckCircle size={12} /> Muvaffaqiyat
    </span>
  )
  if (status === 'PARTIAL') return (
    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-warning)' }}>
      <AlertCircle size={12} /> Qisman
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-danger)' }}>
      <XCircle size={12} /> Xato
    </span>
  )
}

function RuleCard({
  rule,
  onEdit,
  onToggle,
  onDelete,
  onRun,
}: {
  rule: AutomationRule
  onEdit: (r: AutomationRule) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onRun: (id: string) => void
}) {
  const triggerColor = TRIGGER_COLORS[rule.trigger] ?? '#6B7280'

  return (
    <div
      className="rounded-xl border transition-all duration-200 hover:shadow-lg"
      style={{
        background:   'var(--color-bg-elevated)',
        borderColor:  rule.isActive ? `${triggerColor}40` : 'var(--color-border-primary)',
        opacity:      rule.isActive ? 1 : 0.65,
      }}
    >
      {/* Yuqori chiziq */}
      <div className="h-1 rounded-t-xl" style={{ background: rule.isActive ? triggerColor : 'var(--color-border-primary)' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${triggerColor}20` }}>
              <Zap size={16} style={{ color: triggerColor }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {rule.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onRun(rule.id)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
              title="Qo'lda ishga tushirish"
            >
              <Play size={14} style={{ color: 'var(--color-accent-primary)' }} />
            </button>
            <button
              onClick={() => onEdit(rule)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
              title="Tahrirlash"
            >
              <Edit2 size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <button
              onClick={() => onToggle(rule.id)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
              title={rule.isActive ? 'O\'chirish' : 'Yoqish'}
            >
              {rule.isActive
                ? <Pause size={14} style={{ color: 'var(--color-warning)' }} />
                : <Play  size={14} style={{ color: 'var(--color-success)' }} />
              }
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
              title="O'chirish"
            >
              <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
            </button>
          </div>
        </div>

        {/* Harakatlar */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(rule.actions ?? []).map((action, i) => (
            <span key={i}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--color-bg-tertiary)',
                color:      'var(--color-text-secondary)',
                border:     '1px solid var(--color-border-primary)',
              }}
            >
              {ACTION_LABELS[action.type] ?? action.type}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--color-border-primary)' }}>
          <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Activity size={12} />
            <span className="text-xs">{rule.runCount ?? 0} marta</span>
          </div>

          <div className="flex items-center gap-3">
            {rule.lastLog && <StatusBadge status={rule.lastLog.status} />}
            {rule.lastRunAt && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Clock size={11} />
                {new Date(rule.lastRunAt).toLocaleDateString('uz-UZ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AutomationPage() {
  const qc = useQueryClient()
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editing,       setEditing]       = useState<AutomationRule | null>(null)
  const [galleryOpen,   setGalleryOpen]   = useState(false)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn:  automationService.getAll,
  })

  const { data: stats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn:  automationService.getStats,
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => automationService.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Holat o\'zgartirildi')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => automationService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      toast.success('Qoida o\'chirildi')
    },
  })

  const runMut = useMutation({
    mutationFn: (id: string) => automationService.runManually(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success(res.message ?? 'Ishga tushirildi')
    },
  })

  function handleEdit(rule: AutomationRule) {
    setEditing(rule)
    setModalOpen(true)
  }

  function handleNew() {
    setGalleryOpen(true)
  }

  function handleCreateFromScratch() {
    setGalleryOpen(false)
    setEditing(null)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditing(null)
    qc.invalidateQueries({ queryKey: ['automation-rules'] })
    qc.invalidateQueries({ queryKey: ['automation-stats'] })
  }

  const activeRules  = rules.filter(r => r.isActive)
  const inactiveRules = rules.filter(r => !r.isActive)

  return (
    <div className="p-6 space-y-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-primary)20' }}>
            <Zap size={20} style={{ color: 'var(--color-accent-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Avtomatlashtirish
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Hodisalarga avtomatik javob beradigan qoidalar
            </p>
          </div>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={{
            background: 'var(--color-accent-primary)',
            color: '#fff',
          }}
        >
          <Plus size={16} />
          Yangi qoida
        </button>
      </div>

      {/* Statistika kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Jami qoidalar',
            value: stats?.total ?? rules.length,
            icon: Settings2,
            iconCls: 'text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10',
          },
          {
            label: 'Faol qoidalar',
            value: stats?.active ?? activeRules.length,
            icon: Zap,
            iconCls: 'text-[var(--color-success)] bg-[var(--color-success)]/10',
          },
          {
            label: 'Jami ishga tushirildi',
            value: stats?.totalRuns ?? rules.reduce((s, r) => s + (r.runCount ?? 0), 0),
            icon: TrendingUp,
            iconCls: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
          },
          {
            label: 'Oxirgi 24 soat',
            value: (stats?.recentLogs ?? []).filter(l =>
              new Date(l.executedAt) > new Date(Date.now() - 86400000)
            ).length,
            icon: Activity,
            iconCls: 'text-purple-400 bg-purple-400/10',
          },
        ].map((card, i) => (
          <div key={i} className="rounded-xl p-4 border"
            style={{
              background:  'var(--color-bg-elevated)',
              borderColor: 'var(--color-border-primary)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {card.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.iconCls}`}>
                <card.icon size={14} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Faol qoidalar */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl h-48 animate-pulse"
              style={{ background: 'var(--color-bg-elevated)' }} />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border-primary)',
          }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--color-accent-primary)15' }}>
            <Zap size={32} style={{ color: 'var(--color-accent-primary)' }} />
          </div>
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Hali qoidalar yo'q
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Avtomatlashtirish qoidalarini yarating va biznesingizni avtopilotga qo'ying
          </p>
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
          >
            <Plus size={16} /> Birinchi qoidani yaratish
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRules.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-text-secondary)' }}>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Faol qoidalar ({activeRules.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={handleEdit}
                    onToggle={id => toggleMut.mutate(id)}
                    onDelete={id => deleteMut.mutate(id)}
                    onRun={id => runMut.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveRules.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-text-muted)' }}>
                <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                O'chirilgan qoidalar ({inactiveRules.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactiveRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={handleEdit}
                    onToggle={id => toggleMut.mutate(id)}
                    onDelete={id => deleteMut.mutate(id)}
                    onRun={id => runMut.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Oxirgi bajarilishlar */}
      {stats && stats.recentLogs.length > 0 && (
        <div className="rounded-xl border p-5"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border-primary)',
          }}>
          <p className="font-semibold mb-4 flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-primary)' }}>
            <Activity size={16} />
            Oxirgi bajarilishlar
          </p>
          <div className="space-y-2">
            {stats.recentLogs.map(log => (
              <div key={log.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'var(--color-bg-tertiary)' }}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {log.rule?.name ?? TRIGGER_LABELS[log.trigger] ?? log.trigger}
                  </span>
                  {log.entityType && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      ({log.entityType})
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(log.executedAt).toLocaleString('uz-UZ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blueprint gallery */}
      {galleryOpen && (
        <BlueprintGallery
          onClose={() => setGalleryOpen(false)}
          onInstalled={() => { setGalleryOpen(false); handleClose() }}
          onCreateNew={handleCreateFromScratch}
        />
      )}

      {/* Modal */}
      {modalOpen && (
        <AutomationRuleModal
          rule={editing}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
