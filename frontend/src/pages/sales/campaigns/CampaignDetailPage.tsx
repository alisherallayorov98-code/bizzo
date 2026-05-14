import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import api from '@/config/api'

const STATUS_BADGE: Record<string, string> = {
  SENT:    'text-green-400',
  FAILED:  'text-red-400',
  PENDING: 'text-yellow-400',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-6 text-gray-400">Yuklanmoqda...</div>
  if (isError || !c) return (
    <div className="p-6 flex flex-col items-center gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-400">Kampaniya topilmadi</p>
      <button onClick={() => navigate('/campaigns')} className="text-blue-400 hover:underline text-sm">Orqaga</button>
    </div>
  )

  const logs: any[] = c.logs ?? []

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/campaigns')} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{c.name}</h1>
          <span className="text-xs text-gray-400">{c.type} · {c.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Jami yuborildi', value: c.totalSent ?? 0, color: 'text-green-400' },
          { label: 'Xato',           value: c.totalFailed ?? 0, color: 'text-red-400' },
          { label: 'Muvaffaqiyat',   value: c.totalSent > 0 ? `${Math.round(c.totalSent / (c.totalSent + c.totalFailed) * 100)}%` : '—', color: 'text-blue-400' },
          { label: 'Kontaktlar',     value: logs.length, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="bg-[#0D1628] border border-white/10 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D1628] border border-white/10 rounded-xl p-4">
        <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Xabar</h3>
        {c.subject && <p className="text-sm text-gray-300 mb-1"><strong>Mavzu:</strong> {c.subject}</p>}
        <p className="text-gray-200 text-sm whitespace-pre-wrap">{c.body}</p>
      </div>

      {logs.length > 0 && (
        <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">Yuborish jurnali</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Kontakt', 'Holat', 'Xato', 'Vaqt'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-white/5">
                    <td className="px-4 py-2 text-sm text-gray-200">{log.contact?.name ?? log.contactId}</td>
                    <td className="px-4 py-2">
                      <span className={`flex items-center gap-1 text-xs ${STATUS_BADGE[log.status] ?? 'text-gray-400'}`}>
                        {log.status === 'SENT' ? <CheckCircle className="w-3 h-3" /> : log.status === 'FAILED' ? <XCircle className="w-3 h-3" /> : null}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-red-400">{log.error ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('uz') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
