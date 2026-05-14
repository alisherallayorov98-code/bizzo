import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, CheckCircle, XCircle, Clock, Megaphone } from 'lucide-react'
import api from '@/config/api'

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  SENT:    { label: 'Yuborildi', cls: 'text-[var(--color-success)]',          icon: <CheckCircle className="w-3 h-3" /> },
  FAILED:  { label: 'Xato',      cls: 'text-[var(--color-danger)]',            icon: <XCircle     className="w-3 h-3" /> },
  PENDING: { label: 'Kutmoqda',  cls: 'text-[var(--color-warning)]',           icon: <Clock       className="w-3 h-3" /> },
}

const TYPE_LABELS: Record<string, string> = { SMS: 'SMS', EMAIL: 'Email' }
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama', SENDING: 'Yuborilmoqda', COMPLETED: 'Tugadi', FAILED: 'Xatolik',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-[var(--color-bg-secondary)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[var(--color-bg-secondary)] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (isError || !c) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 py-20">
        <AlertCircle className="w-10 h-10 text-[var(--color-danger)]" />
        <p className="text-[var(--color-danger)] font-medium">Kampaniya topilmadi</p>
        <button
          onClick={() => navigate('/campaigns')}
          className="text-[var(--color-accent-primary)] hover:underline text-sm"
        >
          Orqaga qaytish
        </button>
      </div>
    )
  }

  const logs: any[] = c.logs ?? []
  const successRate = (c.totalSent ?? 0) > 0
    ? Math.round((c.totalSent / (c.totalSent + (c.totalFailed ?? 0))) * 100)
    : 0

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/campaigns')}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{c.name}</h1>
          <span className="text-xs text-[var(--color-text-muted)]">
            {TYPE_LABELS[c.type] ?? c.type} · {STATUS_LABELS[c.status] ?? c.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Jami yuborildi', value: c.totalSent ?? 0,  color: 'text-[var(--color-success)]' },
          { label: 'Xato',           value: c.totalFailed ?? 0, color: 'text-[var(--color-danger)]' },
          { label: 'Muvaffaqiyat',   value: `${successRate}%`,  color: 'text-[var(--color-accent-primary)]' },
          { label: 'Kontaktlar',     value: logs.length,        color: 'text-[var(--color-text-primary)]' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Message */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-4">
        <h3 className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide font-medium">Xabar</h3>
        {c.subject && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            <span className="font-medium text-[var(--color-text-primary)]">Mavzu:</span> {c.subject}
          </p>
        )}
        <p className="text-[var(--color-text-primary)] text-sm whitespace-pre-wrap leading-relaxed">{c.body}</p>
      </div>

      {/* Logs */}
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] border-dashed rounded-xl">
          <Megaphone className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-sm text-[var(--color-text-muted)]">Yuborish jurnali yo'q</p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              Yuborish jurnali ({logs.length} ta)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)]">
                  {['Kontakt', 'Holat', 'Xato', 'Vaqt'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-[var(--color-text-muted)] font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const st = STATUS_CFG[log.status]
                  return (
                    <tr key={log.id} className="border-b border-[var(--color-border-primary)]/50 hover:bg-[var(--color-bg-elevated)] transition-colors">
                      <td className="px-4 py-2.5 text-sm text-[var(--color-text-primary)]">
                        {log.contact?.name ?? log.contactId ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`flex items-center gap-1 text-xs font-medium ${st?.cls ?? 'text-[var(--color-text-muted)]'}`}>
                          {st?.icon} {st?.label ?? log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-danger)] max-w-[200px] truncate">
                        {log.error ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString('uz') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
