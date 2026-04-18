import { useState } from 'react'
import {
  HelpCircle, X, Search, ChevronRight, ExternalLink,
  Rocket, Warehouse, ShoppingCart, Brain,
} from 'lucide-react'
import { cn } from '@utils/cn'

const FAQ_ITEMS = [
  {
    category: 'Boshlash',
    Icon:     Rocket,
    items: [
      { q: 'BIZZO ni qanday boshlash kerak?',     a: 'Onboarding wizard orqali kompaniya nomini kiriting va birinchi mahsulotni qo\'shing.' },
      { q: 'Demo ma\'lumotlar nima uchun kerak?', a: 'Tizimni sinab ko\'rish uchun. Haqiqiy ishdan oldin barcha funksiyalarni test qilishingiz mumkin.' },
      { q: 'Foydalanuvchi qo\'shish mumkinmi?',   a: 'Sozlamalar > Foydalanuvchilar bo\'limidan yangi a\'zo qo\'shing.' },
    ],
  },
  {
    category: 'Ombor',
    Icon:     Warehouse,
    items: [
      { q: 'Mahsulot qo\'shish qanday?',           a: 'Mahsulotlar sahifasidan "Yangi mahsulot" tugmasini bosing.' },
      { q: 'Kirim/chiqim qanday qayd etiladi?',    a: 'Ombor > "Kirim/Chiqim" tugmasi orqali.' },
      { q: 'Minimal qoldiq nima?',                 a: 'Bu miqdordan kam bo\'lsa tizim sizni ogohlantiradi.' },
    ],
  },
  {
    category: 'Savdo',
    Icon:     ShoppingCart,
    items: [
      { q: 'Deal nima?',            a: 'Sotuv imkoniyati. Lead dan WON gacha kuzatiladi.' },
      { q: 'Invoice nima?',         a: 'Hisob-faktura. Deal yutilganda avtomatik yaratiladi.' },
      { q: 'Qarz qanday yoziladi?', a: 'Invoice to\'langanda yoki Qarzlar bo\'limida qo\'lda.' },
    ],
  },
  {
    category: 'AI Yordamchi',
    Icon:     Brain,
    items: [
      { q: 'AI ga qanday savol berish kerak?',    a: 'Ekranning pastki o\'ng burchagidagi yulduz tugmani bosing.' },
      { q: 'AI qanday savollarga javob beradi?',  a: 'Sotuv, ombor, qarzlar, xodimlar haqida har qanday savol.' },
      { q: 'AI ma\'lumotlari qanchalik to\'g\'ri?', a: 'AI sizning haqiqiy ma\'lumotlaringizga asoslanadi.' },
    ],
  },
]

export function HelpCenter() {
  const [open,     setOpen]     = useState(false)
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredFAQ = FAQ_ITEMS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter(cat => cat.items.length > 0)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-24 right-6 z-30',
          'w-10 h-10 rounded-full bg-bg-elevated border border-border-secondary',
          'flex items-center justify-center text-text-muted hover:text-text-primary',
          'shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110',
        )}
        title="Yordam"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="fixed bottom-36 right-6 z-30 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-accent-primary" />
              <span className="font-display font-semibold text-sm text-text-primary">Yordam markazi</span>
            </div>
            <button onClick={() => setOpen(false)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-3 border-b border-border-primary">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Savol qidirish..."
                className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-bg-tertiary text-text-primary border border-border-primary focus:outline-none focus:border-accent-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-80">
            {filteredFAQ.map(cat => (
              <div key={cat.category}>
                <div className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary/50">
                  <cat.Icon size={13} className="text-accent-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{cat.category}</span>
                </div>
                {cat.items.map(item => (
                  <div key={item.q} className="border-b border-border-primary/50">
                    <button
                      onClick={() => setExpanded(expanded === item.q ? null : item.q)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-bg-tertiary/30 transition-colors"
                    >
                      <span className="text-xs text-text-primary flex-1 pr-2">{item.q}</span>
                      <ChevronRight size={12} className={cn('text-text-muted shrink-0 transition-transform', expanded === item.q && 'rotate-90')} />
                    </button>
                    {expanded === item.q && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-text-secondary leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border-primary">
            <a href="https://docs.bizzo.uz" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-accent-primary hover:text-accent-hover transition-colors">
              <ExternalLink size={12} />
              To'liq dokumentatsiya
            </a>
          </div>
        </div>
      )}
    </>
  )
}

export default HelpCenter
