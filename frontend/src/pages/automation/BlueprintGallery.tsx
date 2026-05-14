import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Star, Zap, Package, ShoppingCart, TrendingUp, Users, Clock, DollarSign, FileText, CheckSquare, Sun, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const CATEGORY_CFG: Record<string, { label: string; color: string }> = {
  finance:  { label: 'Moliya',  color: 'bg-green-500/20 text-green-400 border-green-500/30'  },
  warehouse:{ label: 'Ombor',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'     },
  sales:    { label: 'Savdo',   color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'},
  hr:       { label: 'HR',      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'},
  schedule: { label: 'Jadval',  color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'     },
  other:    { label: 'Boshqa',  color: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border-primary)]' },
}

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <Zap         className="w-5 h-5" />,
  AlertCircle:   <Zap         className="w-5 h-5" />,
  Package:       <Package     className="w-5 h-5" />,
  ShoppingCart:  <ShoppingCart className="w-5 h-5" />,
  CheckSquare:   <CheckSquare className="w-5 h-5" />,
  FileText:      <FileText    className="w-5 h-5" />,
  Sun:           <Sun         className="w-5 h-5" />,
  DollarSign:    <DollarSign  className="w-5 h-5" />,
  Calendar:      <Calendar    className="w-5 h-5" />,
  TrendingUp:    <TrendingUp  className="w-5 h-5" />,
  UserPlus:      <Users       className="w-5 h-5" />,
  Clock:         <Clock       className="w-5 h-5" />,
}

const CATEGORY_ORDER = ['finance', 'sales', 'warehouse', 'hr', 'schedule', 'other']

interface Props {
  onClose:     () => void
  onInstalled: () => void
  onCreateNew: () => void
}

export default function BlueprintGallery({ onClose, onInstalled, onCreateNew }: Props) {
  const qc = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('all')
  const [installing, setInstalling] = useState<string | null>(null)

  const { data: blueprints = [], isLoading } = useQuery({
    queryKey: ['automation-blueprints'],
    queryFn:  () => api.get('/automation/blueprints').then(r => r.data),
  })

  const installMut = useMutation({
    mutationFn: (key: string) => api.post(`/automation/blueprints/${key}/install`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      toast.success('Shablon o\'rnatildi!')
      onInstalled()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
    onSettled: () => setInstalling(null),
  })

  const filtered = activeCategory === 'all'
    ? blueprints
    : blueprints.filter((b: any) => b.category === activeCategory)

  const categories = ['all', ...CATEGORY_ORDER.filter(c =>
    blueprints.some((b: any) => b.category === c)
  )]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-primary)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[var(--color-text-primary)] font-semibold text-lg">
              Avtomatlashtirish shablonlari
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              Bir klik bilan tayyor qoidalarni o'rnating
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-5 pt-4 flex gap-2 flex-wrap shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30 ${
                activeCategory === cat
                  ? 'bg-[var(--color-accent-primary)] border-[var(--color-accent-primary)] text-white'
                  : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat === 'all' ? 'Barchasi' : (CATEGORY_CFG[cat]?.label ?? cat)}
            </button>
          ))}
        </div>

        {/* Blueprint grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-[var(--color-bg-elevated)] rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <p className="text-sm">Bu kategoriyada shablon yo'q</p>
            </div>
          ) : filtered.map((bp: any) => {
            const catCfg = CATEGORY_CFG[bp.category] ?? CATEGORY_CFG.other
            const icon   = ICON_MAP[bp.icon] ?? <Zap className="w-5 h-5" />
            const isInst = installing === bp.key

            return (
              <div
                key={bp.key}
                className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] rounded-xl p-4 flex items-center gap-4 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-primary)]/10 flex items-center justify-center text-[var(--color-accent-primary)] shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{bp.name}</p>
                    {bp.isPopular && (
                      <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                        <Star className="w-2.5 h-2.5 fill-yellow-400" /> Mashhur
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catCfg.color}`}>
                      {catCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{bp.description}</p>
                </div>
                <button
                  onClick={() => { setInstalling(bp.key); installMut.mutate(bp.key) }}
                  disabled={isInst}
                  className="shrink-0 px-3 py-1.5 bg-[var(--color-accent-primary)] hover:opacity-90 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
                >
                  {isInst ? '...' : "O'rnatish"}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--color-border-primary)] flex items-center justify-between shrink-0">
          <p className="text-xs text-[var(--color-text-muted)]">Yoki noldan o'z qoidangizni yarating</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] text-[var(--color-text-primary)] text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          >
            Noldan yaratish →
          </button>
        </div>
      </div>
    </div>
  )
}
