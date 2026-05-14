import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, DollarSign, Clock, CheckCircle,
  AlertCircle, User, Phone, Mail, Building2,
} from 'lucide-react'
import api from '@config/api'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn } from '@utils/cn'

interface PortalContact {
  id: string; name: string; email: string; phone: string; balance: number; type: string
}
interface PortalDebt {
  id: string; amount: number; remaining: number; paidAmount: number
  dueDate: string; description: string; type: string; createdAt: string
}
interface PortalInvoice {
  id: string; invoiceNumber: string; totalAmount: number; status: string; createdAt: string
  items: Array<{ quantity: number; price: number; product: { name: string } }>
}
interface PortalData {
  token:    string
  contact:  PortalContact
  debts:    PortalDebt[]
  invoices: PortalInvoice[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: "Qoralama",   color: "text-gray-500" },
  SENT:     { label: "Yuborildi",  color: "text-blue-500" },
  PAID:     { label: "To'landi",   color: "text-emerald-500" },
  PARTIAL:  { label: "Qisman",     color: "text-amber-500" },
  OVERDUE:  { label: "Muddati o'tgan", color: "text-red-500" },
  CANCELLED:{ label: "Bekor",      color: "text-gray-400" },
}

export default function PortalPage() {
  const [params]     = useSearchParams()
  const token        = params.get('token')
  const [data,   setData]   = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,  setError]  = useState('')
  const [tab,    setTab]    = useState<'debts' | 'invoices'>('debts')

  useEffect(() => {
    if (!token) { setError("Token topilmadi. Iltimos, kompaniyangizdan link so'rang."); setLoading(false); return }
    api.get(`/portal/verify?token=${token}`)
      .then(r => setData(r.data.data ?? r.data))
      .catch(() => setError('Link yaroqsiz yoki muddati o\'tgan.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E]">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E] p-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
        <h1 className="text-xl font-bold text-white mb-2">Kirish mumkin emas</h1>
        <p className="text-gray-400">{error}</p>
      </div>
    </div>
  )

  const overdueDebts = data.debts.filter(d => d.dueDate && new Date(d.dueDate) < new Date())
  const totalOwed    = data.debts.filter(d => d.type === 'RECEIVABLE').reduce((s, d) => s + d.remaining, 0)

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0D1425]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">
            B
          </div>
          <div>
            <p className="text-sm font-semibold">BIZZO Mijoz Portali</p>
            <p className="text-xs text-gray-400">Shaxsiy kabinet</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Contact card */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">{data.contact.name}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                {data.contact.email && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Mail size={11} /> {data.contact.email}
                  </span>
                )}
                {data.contact.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={11} /> {data.contact.phone}
                  </span>
                )}
              </div>
            </div>
            {totalOwed > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Qarzdorlik</p>
                <p className="font-bold text-red-400 tabular-nums">{formatCurrency(totalOwed)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Overdue alert */}
        {overdueDebts.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Muddati o'tgan qarzlar</p>
              <p className="text-xs text-red-400 mt-0.5">
                {overdueDebts.length}ta qarz muddati o'tgan. Iltimos, kompaniya bilan bog'laning.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1">
          {([
            { id: 'debts',    label: `Qarzlar (${data.debts.length})` },
            { id: 'invoices', label: `Hisob-fakturalar (${data.invoices.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Debts tab */}
        {tab === 'debts' && (
          <div className="space-y-3">
            {data.debts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500/50" />
                <p>Barcha qarzlar to'langan</p>
              </div>
            ) : data.debts.map(d => {
              const isOverdue = d.dueDate && new Date(d.dueDate) < new Date()
              const pct = d.amount > 0 ? Math.round((d.paidAmount / d.amount) * 100) : 0
              return (
                <div key={d.id} className={cn(
                  'p-4 rounded-xl border',
                  isOverdue
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/10 bg-white/5',
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.description || 'Qarz'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {d.dueDate && (
                          <span className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-red-400' : 'text-gray-400')}>
                            <Clock size={11} />
                            {formatDate(d.dueDate)}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{d.type === 'RECEIVABLE' ? 'To\'lash kerak' : 'Kutilmoqda'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums">{formatCurrency(d.remaining)}</p>
                      <p className="text-xs text-gray-400">/ {formatCurrency(d.amount)}</p>
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>To'langan</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Invoices tab */}
        {tab === 'invoices' && (
          <div className="space-y-3">
            {data.invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>Hisob-fakturalar yo'q</p>
              </div>
            ) : data.invoices.map(inv => {
              const s = STATUS_LABELS[inv.status] ?? { label: inv.status, color: 'text-gray-400' }
              return (
                <div key={inv.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-blue-400" />
                        <p className="text-sm font-semibold">#{inv.invoiceNumber}</p>
                        <span className={cn('text-xs font-medium', s.color)}>{s.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(inv.createdAt)}</p>
                    </div>
                    <p className="font-bold tabular-nums text-blue-300">{formatCurrency(Number(inv.totalAmount))}</p>
                  </div>

                  {inv.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                      {inv.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-400">
                          <span>{item.product?.name}</span>
                          <span className="tabular-nums">{item.quantity} × {formatCurrency(item.price)}</span>
                        </div>
                      ))}
                      {inv.items.length > 3 && (
                        <p className="text-xs text-gray-500">+{inv.items.length - 3} ta mahsulot</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 pb-4">
          Powered by BIZZO ERP · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
