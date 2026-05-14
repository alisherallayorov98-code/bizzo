import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const STATUS_CFG = {
  SUCCESS: { label: 'Muvaffaqiyat', color: 'text-green-400',  icon: <CheckCircle  className="w-3.5 h-3.5" /> },
  PARTIAL: { label: 'Qisman',       color: 'text-yellow-400', icon: <AlertCircle  className="w-3.5 h-3.5" /> },
  FAILED:  { label: 'Xato',         color: 'text-red-400',    icon: <XCircle      className="w-3.5 h-3.5" /> },
}

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
  MANUAL:             'Qo\'lda',
  QUOTATION_APPROVED: 'Taklifnoma tasdiqlandi',
  QUOTATION_EXPIRED:  'Taklifnoma muddati o\'tdi',
  PURCHASE_RECEIVED:  'Xarid qabul qilindi',
  DAILY_MORNING:      'Kunlik (09:00)',
  WEEKLY_MONDAY:      'Haftalik (Dushanba)',
  MONTHLY_FIRST:      'Oylik (1-kun)',
}

export default function AutomationLogsPage() {
  const qc = useQueryClient()
  const [page,    setPage]    = useState(1)
  const [status,  setStatus]  = useState('')
  const [trigger, setTrigger] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['automation-logs', page, status, trigger],
    queryFn:  () => api.get('/automation/logs', {
      params: { page, limit: 20, ...(status && { status }), ...(trigger && { trigger }) },
    }).then(r => r.data),
  })

  const retryMut = useMutation({
    mutationFn: (id: string) => api.post(`/automation/logs/${id}/retry`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-logs'] }); toast.success('Qayta ishga tushirildi') },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const logs:  any[] = data?.logs  ?? []
  const total: number = data?.total ?? 0
  const pages: number = data?.pages ?? 1

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Bajarilish jurnali</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">Barcha holat</option>
            <option value="SUCCESS">Muvaffaqiyat</option>
            <option value="PARTIAL">Qisman</option>
            <option value="FAILED">Xato</option>
          </select>
          <select value={trigger} onChange={e => { setTrigger(e.target.value); setPage(1) }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="">Barcha trigger</option>
            {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['Holat', 'Qoida', 'Trigger', 'Entity', 'Harakatlar', 'Vaqt', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">Log yozuvlari yo'q</td>
              </tr>
            ) : logs.map((log: any) => {
              const st = STATUS_CFG[log.status as keyof typeof STATUS_CFG]
              const actions: any[] = log.actionsRun ?? []
              return (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${st?.color ?? 'text-gray-400'}`}>
                      {st?.icon} {st?.label ?? log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-200 max-w-[160px] truncate">
                    {log.rule?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {TRIGGER_LABELS[log.trigger] ?? log.trigger}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {log.entityType && <span>{log.entityType}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {actions.map((a: any, i: number) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          a.status === 'ok'
                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                            : 'border-red-500/30 text-red-400 bg-red-500/10'
                        }`}>
                          {a.type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.executedAt).toLocaleString('uz-UZ')}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.status === 'FAILED' && (
                      <button onClick={() => retryMut.mutate(log.id)} disabled={retryMut.isPending}
                        title="Qayta ishga tushirish"
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{total} ta yozuv</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 hover:text-white disabled:opacity-30 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 hover:text-white disabled:opacity-30 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
