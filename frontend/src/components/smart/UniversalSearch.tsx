import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, Package, FileText, DollarSign, Briefcase, BarChart2 } from 'lucide-react'
import { api } from '@config/api'
import { useAuthStore } from '@store/auth.store'

interface SearchResult {
  id: string
  type: 'contact' | 'product' | 'employee' | 'contract' | 'deal'
  title: string
  subtitle?: string
  link: string
}

const TYPE_ICONS: Record<SearchResult['type'], any> = {
  contact:  Users,
  product:  Package,
  employee: Briefcase,
  contract: FileText,
  deal:     DollarSign,
}
const TYPE_LABELS: Record<SearchResult['type'], string> = {
  contact:  'Kontragent',
  product:  'Mahsulot',
  employee: 'Xodim',
  contract: 'Shartnoma',
  deal:     'Bitim',
}
const TYPE_COLORS: Record<SearchResult['type'], string> = {
  contact:  '#3B82F6',
  product:  '#10B981',
  employee: '#8B5CF6',
  contract: '#F59E0B',
  deal:     '#EC4899',
}

const QUICK_LINKS = [
  { label: 'Dashboard',       link: '/dashboard',         icon: BarChart2  },
  { label: 'Kontragentlar',   link: '/contacts',          icon: Users      },
  { label: 'Mahsulotlar',     link: '/products',          icon: Package    },
  { label: 'Smart Tahlil',    link: '/smart',             icon: BarChart2  },
  { label: 'Xodimlar',        link: '/employees',         icon: Briefcase  },
  { label: 'Shartnomalar',    link: '/contracts',         icon: FileText   },
]

async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim() || query.length < 2) return []
  try {
    const [contacts, products, employees, contracts, deals] = await Promise.allSettled([
      api.get('/contacts', { params: { search: query, limit: 4 } })
        .then(r => (r.data.data?.data || []).map((c: any): SearchResult => ({
          id: c.id, type: 'contact', title: c.name,
          subtitle: c.phone || c.type,
          link: `/contacts/${c.id}`,
        }))),
      api.get('/products', { params: { search: query, limit: 4 } })
        .then(r => (r.data.data?.data || []).map((p: any): SearchResult => ({
          id: p.id, type: 'product', title: p.name,
          subtitle: `${Number(p.sellPrice || 0).toLocaleString('uz-UZ')} so'm`,
          link: `/products/${p.id}`,
        }))),
      api.get('/employees', { params: { search: query, limit: 3 } })
        .then(r => (r.data.data?.data || []).map((e: any): SearchResult => ({
          id: e.id, type: 'employee',
          title: `${e.firstName} ${e.lastName}`,
          subtitle: e.position,
          link: `/employees/${e.id}`,
        }))),
      api.get('/contracts', { params: { search: query, limit: 3 } })
        .then(r => (r.data.data?.data || r.data.data || []).map((c: any): SearchResult => ({
          id: c.id, type: 'contract', title: c.title,
          subtitle: c.contractNumber ? `№ ${c.contractNumber}` : c.status,
          link: `/contracts/${c.id}`,
        }))),
      api.get('/deals', { params: { search: query, limit: 3 } })
        .then(r => (r.data.data?.data || r.data.data || []).map((d: any): SearchResult => ({
          id: d.id, type: 'deal', title: d.title,
          subtitle: d.amount ? `${Number(d.amount).toLocaleString('uz-UZ')} so'm` : d.stage,
          link: `/sales/deals`,
        }))),
    ])

    return [
      ...(contacts.status  === 'fulfilled' ? contacts.value  : []),
      ...(products.status  === 'fulfilled' ? products.value  : []),
      ...(employees.status === 'fulfilled' ? employees.value : []),
      ...(contracts.status === 'fulfilled' ? contracts.value : []),
      ...(deals.status     === 'fulfilled' ? deals.value     : []),
    ].slice(0, 15)
  } catch {
    return []
  }
}

export function UniversalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const navigate  = useNavigate()
  const { isAuthenticated } = useAuthStore()

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setResults([]) }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await globalSearch(query)
      setResults(r)
      setSelected(0)
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const go = useCallback((link: string) => {
    navigate(link)
    setOpen(false)
    setQuery('')
  }, [navigate])

  // Keyboard nav
  const items = query ? results : QUICK_LINKS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && items[selected]) {
        const item = items[selected]
        go('link' in item ? (item as any).link : (item as SearchResult).link)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, items, selected, go])

  if (!isAuthenticated()) return null

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13,
          transition: 'all 0.15s',
          width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        <Search size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Qidirish... (mahsulot, mijoz, hujjat)</span>
        <span style={{
          padding: '1px 6px', borderRadius: 4, fontSize: 11,
          backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)',
          fontFamily: 'monospace',
        }}>⌘K</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 560, backgroundColor: '#0D1526',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Search size={18} color="#64748B" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Kontragent, mahsulot, xodim..."
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#E2E8F0', fontSize: 15, fontFamily: 'inherit',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                  <X size={16} />
                </button>
              )}
              <kbd style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, backgroundColor: 'rgba(255,255,255,0.06)', color: '#64748B' }}>Esc</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>Qidirilmoqda...</div>
              )}

              {!query && !loading && (
                <div style={{ padding: '12px 8px' }}>
                  <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tez havolalar
                  </div>
                  {QUICK_LINKS.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.link}
                        onClick={() => go(item.link)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          backgroundColor: selected === i ? 'rgba(59,130,246,0.1)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <Icon size={16} color="#64748B" />
                        <span style={{ color: '#E2E8F0', fontSize: 14 }}>{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {query && !loading && results.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  "{query}" bo'yicha natija topilmadi
                </div>
              )}

              {query && !loading && results.length > 0 && (
                <div style={{ padding: '8px' }}>
                  {results.map((r, i) => {
                    const Icon  = TYPE_ICONS[r.type]
                    const color = TYPE_COLORS[r.type]
                    return (
                      <div
                        key={r.id}
                        onClick={() => go(r.link)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          backgroundColor: selected === i ? 'rgba(59,130,246,0.1)' : 'transparent',
                        }}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          backgroundColor: color + '20',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={15} color={color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 500 }}>{r.title}</div>
                          {r.subtitle && <div style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>{r.subtitle}</div>}
                        </div>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 5,
                          backgroundColor: color + '15', color,
                        }}>
                          {TYPE_LABELS[r.type]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', gap: 16, color: '#475569', fontSize: 11,
            }}>
              <span><kbd style={{ fontFamily: 'monospace' }}>↑↓</kbd> navigatsiya</span>
              <span><kbd style={{ fontFamily: 'monospace' }}>Enter</kbd> ochish</span>
              <span><kbd style={{ fontFamily: 'monospace' }}>Esc</kbd> yopish</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
