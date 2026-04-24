import { Link, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@utils/cn'

function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobile] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const NAV = [
    { label: 'Imkoniyatlar', href: '#features' },
    { label: 'Narxlar',      href: '#pricing'  },
    { label: 'Modullar',     href: '#modules'  },
    { label: 'FAQ',          href: '#faq'      },
  ]

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-[#0A0F1E]/95 backdrop-blur-xl border-b border-white/5 shadow-xl'
        : 'bg-transparent',
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-lg">B</span>
            </div>
            <span className="font-black text-xl text-white tracking-tight">BIZZO</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(item => (
              <a key={item.href} href={item.href}
                className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-2">
              Kirish
            </Link>
            <Link to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5">
              Bepul boshlash →
            </Link>
          </div>

          <button onClick={() => setMobile(!mobileOpen)}
            className="md:hidden p-2 text-white/60 hover:text-white transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0A0F1E]/98 backdrop-blur-xl border-t border-white/5 px-4 pb-4">
          {NAV.map(item => (
            <a key={item.href} href={item.href} onClick={() => setMobile(false)}
              className="flex items-center py-3 text-sm text-white/70 border-b border-white/5 hover:text-white transition-colors">
              {item.label}
            </a>
          ))}
          <div className="flex gap-3 mt-4">
            <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 transition-all">
              Kirish
            </Link>
            <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-all">
              Boshlash
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#060B16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-black">B</span>
              </div>
              <span className="font-black text-lg text-white">BIZZO</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              O'zbekiston biznesini boshqarishning eng aqlli platformasi.
            </p>
          </div>

          {[
            { title: 'Platforma', links: [
              { label: 'Ombor boshqaruvi',    href: '#' },
              { label: 'Mijozlar (CRM)',       href: '#' },
              { label: 'Xodimlar va ish haqi', href: '#' },
              { label: 'Smart tahlil',         href: '#' },
            ]},
            { title: 'Modullar', links: [
              { label: 'Chiqindi qayta ishlash', href: '#' },
              { label: 'Savdo pipeline (CRM)',   href: '#' },
              { label: 'Qurilish',               href: '#' },
              { label: 'Ishlab chiqarish',       href: '#' },
            ]},
            { title: 'Kompaniya', links: [
              { label: 'Narxlar',    href: '#pricing' },
              { label: "Bog'lanish", href: 'mailto:info@bizzo.uz' },
              { label: 'Shartlar',   href: '#' },
              { label: 'Maxfiylik',  href: '#' },
            ]},
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white/80 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-white/40 hover:text-white/70 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">© 2025 BIZZO. Barcha huquqlar himoyalangan.</p>
          <p className="text-xs text-white/30">🇺🇿 O'zbekiston uchun yaratilgan</p>
        </div>
      </div>
    </footer>
  )
}

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-[#060B16]">
      <LandingHeader />
      <Outlet />
      <LandingFooter />
    </div>
  )
}
