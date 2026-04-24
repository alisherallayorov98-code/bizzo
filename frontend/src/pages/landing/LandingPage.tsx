import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Warehouse, Users, Wallet, TrendingDown, BarChart3,
  Brain, Trash2, HardHat, Factory, ShoppingCart,
  ArrowRight, Check, ChevronDown, Zap,
  Shield, Globe, Clock, Star,
} from 'lucide-react'
import { cn } from '@utils/cn'

// ============================================================
// HERO
// ============================================================
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
          <Zap size={14} className="animate-pulse" />
          <span>O'zbekiston #1 biznes boshqaruv platformasi</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight mb-6">
          Biznesingizni{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
            aqlli
          </span>{' '}
          boshqaring
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Ombor, mijozlar, xodimlar, savdo, qarzlar — barchasi bir platformada.
          AI tahlil, real-time bildirishnomalar, va professional hisobotlar bilan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/register"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-base transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
            Bepul boshlash
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#features"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 font-medium text-base transition-all">
            Batafsil ko'rish
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
          {[
            { icon: Shield, text: "Ma'lumotlar xavfsiz" },
            { icon: Globe,  text: "O'zbekiston serverlari" },
            { icon: Clock,  text: '5 daqiqada boshlash' },
            { icon: Star,   text: 'Kredit kartasiz' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5">
              <item.icon size={14} className="text-blue-400/60" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="mt-16 relative">
          <div className="absolute -inset-4 bg-gradient-to-b from-blue-500/10 to-violet-500/10 rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-[#0D1526] shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0A0F1E]/80">
              <div className="flex gap-1.5">
                {['#EF4444', '#F59E0B', '#10B981'].map(c => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c, opacity: 0.8 }} />
                ))}
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center justify-center">
                <span className="text-xs text-white/20 font-mono">app.bizzo.uz/dashboard</span>
              </div>
            </div>
            <div className="p-4 bg-[#0D1526] min-h-[280px]">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Debitor',    value: '45.2M', color: 'text-green-400',  bg: 'bg-green-400/10'  },
                  { label: 'Kreditor',   value: '12.8M', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                  { label: 'Mahsulotlar',value: '248',   color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
                  { label: 'Xodimlar',   value: '32',    color: 'text-violet-400', bg: 'bg-violet-400/10' },
                ].map(stat => (
                  <div key={stat.label} className={cn('rounded-xl p-3 border border-white/5', stat.bg)}>
                    <p className="text-[10px] text-white/40 mb-1">{stat.label}</p>
                    <p className={cn('text-lg font-black', stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-xl bg-white/3 border border-white/5 p-3 h-32 flex items-end justify-around gap-1">
                  {[40,65,45,80,55,90,70,85,60,95,75,100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400 opacity-70 min-w-0"
                      style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="rounded-xl bg-white/3 border border-white/5 p-3 h-32">
                  <p className="text-[10px] text-white/40 mb-2">Health Score</p>
                  <div className="flex items-center justify-center h-16">
                    <span className="text-4xl font-black text-green-400">A</span>
                  </div>
                  <p className="text-[10px] text-green-400/70 text-center">82/100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// STATS
// ============================================================
function Stats() {
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '500+',  label: 'Faol kompaniyalar' },
            { value: '4.9★',  label: 'Foydalanuvchi bahosi' },
            { value: '99.9%', label: 'Uptime' },
            { value: '24/7',  label: 'Texnik yordam' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-sm text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// IMKONIYATLAR
// ============================================================
function Features() {
  const FEATURES = [
    {
      icon: Warehouse, color: 'blue',
      title: 'Ombor boshqaruvi',
      desc: "Tovar kirim-chiqim hujjatlari, minimal qoldiq ogohlantirish, inventarizatsiya. Ombor harakati real-time kuzatiladi.",
      items: ["Tovar kirim/chiqim", "Minimal qoldiq ogohlantirish", "Ko'p omborxona", "Inventarizatsiya"],
    },
    {
      icon: Users, color: 'violet',
      title: 'Mijozlar 360°',
      desc: "Har mijozning to'liq tarixi — xaridlar, qarzlar, bitimlar, ombor harakatlari bir ekranda.",
      items: ["360° mijoz kartasi", "STIR bo'yicha qidirish", "Qarz tarixi", "Debitor/kreditor balans"],
    },
    {
      icon: TrendingDown, color: 'yellow',
      title: 'Qarzlar tizimi',
      desc: "Debitor va kreditor qarzlar, muddati o'tgan qarzlar uchun avtomatik SMS/Telegram eslatma.",
      items: ["Muddati o'tgan eslatma", "Qarz tarixi", "To'lov qabul qilish", "SMS/Telegram xabar"],
    },
    {
      icon: Wallet, color: 'green',
      title: 'Xodimlar va ish haqi',
      desc: "Oylik va kunlik ishchilar, avans, bonus, jarima — to'liq ish haqi tizimi.",
      items: ["Oylik va kunlik hisob", "Avans boshqaruvi", "Ommaviy to'lash", "Oylik hisobot"],
    },
    {
      icon: Brain, color: 'pink',
      title: 'AI Smart Tahlil',
      desc: "ABC tahlil, RFM segmentatsiya, savdo bashorati, HealthScore — sun'iy intellekt tavsiyalari.",
      items: ["ABC tahlil (mahsulot)", "RFM (mijozlar)", "Savdo bashorati", "Biznes HealthScore"],
    },
    {
      icon: BarChart3, color: 'orange',
      title: 'Hisobotlar',
      desc: "Moliyaviy hisobot, ombor harakatlari, xodimlar, savdo — Excel va PDF eksport.",
      items: ["Moliyaviy P&L", "Ombor hisoboti", "Xodimlar hisoboti", "Excel/PDF eksport"],
    },
  ]

  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: 'text-blue-400'   },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: 'text-yellow-400' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: 'text-green-400'  },
    pink:   { bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   icon: 'text-pink-400'   },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'text-orange-400' },
  }

  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Imkoniyatlar</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Biznes uchun hamma narsa</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Excel jadvallari va daftarlardan chiqing. BIZZO bilan barchasi avtomatik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(feat => {
            const colors = colorMap[feat.color]
            return (
              <div key={feat.title}
                className="group p-6 rounded-2xl border transition-all duration-300 bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/10 hover:-translate-y-1 hover:shadow-2xl">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 border', colors.bg, colors.border)}>
                  <feat.icon size={22} className={colors.icon} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-4">{feat.desc}</p>
                <ul className="space-y-1.5">
                  {feat.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-white/40">
                      <Check size={12} className={colors.icon} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// MODULLAR
// ============================================================
function Modules() {
  const MODULES = [
    { icon: Trash2,       name: 'Chiqindi qayta ishlash', desc: 'Chiqindi partiyalari, ishchilar hisobi, yo\'qotish tahlili',  color: '#7C3AED' },
    { icon: ShoppingCart, name: 'Savdo (CRM)',             desc: 'Pipeline, bitimlar, hisob-faktura, taklifnoma',               color: '#2563EB' },
    { icon: HardHat,      name: 'Qurilish',               desc: 'Loyihalar, byudjet, materiallar, kunlik ish logi',            color: '#D97706' },
    { icon: Factory,      name: 'Ishlab chiqarish',        desc: 'Retseptlar, partiyalar, xom ashyo nazorati, bashorat',        color: '#DC2626' },
  ]

  return (
    <section id="modules" className="py-24 bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-semibold uppercase tracking-wider mb-3">Ixtisoslashgan modullar</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Sizning soha uchun</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Asosiy platformaga qo'shimcha modullar — faqat keraklilarini ulang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULES.map(mod => (
            <div key={mod.name}
              className="group flex gap-5 p-6 rounded-2xl border border-white/5 hover:border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:-translate-y-0.5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: mod.color + '20', border: `1px solid ${mod.color}30` }}>
                <mod.icon size={24} style={{ color: mod.color }} />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">{mod.name}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// PRICING
// ============================================================
function Pricing() {
  const PLANS = [
    {
      name: 'Starter', price: '199 000', desc: 'Kichik biznes uchun', color: '#60A5FA', popular: false,
      features: ['3 foydalanuvchi', 'Ombor', 'Mijozlar', 'Qarzlar', 'Hisobotlar'],
    },
    {
      name: 'Business', price: '399 000', desc: "O'rta va katta biznes", color: '#A78BFA', popular: true,
      features: ['10 foydalanuvchi', 'Barcha asosiy funksiyalar', '1 ta modul', 'AI tahlil', 'SMS/Telegram'],
    },
    {
      name: 'Pro', price: '799 000', desc: 'Korporativ mijozlar uchun', color: '#F472B6', popular: false,
      features: ['Cheksiz foydalanuvchi', 'Barcha funksiyalar', 'Barcha modullar', 'API kirish', 'Ustuvor yordam'],
    },
  ]

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">Narxlar</p>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Oddiy va shaffof</h2>
          <p className="text-white/50">30 kun bepul sinab ko'ring — karta kerak emas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div key={plan.name}
              className={cn(
                'relative p-7 rounded-2xl border transition-all',
                plan.popular
                  ? 'border-violet-500/50 bg-violet-500/5 shadow-2xl shadow-violet-500/10'
                  : 'border-white/5 bg-white/[0.03] hover:border-white/10',
              )}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-500 text-white text-xs font-bold">
                  Mashhur
                </div>
              )}
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-white/40 mb-5">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-sm text-white/40">so'm/oy</span>
              </div>
              <ul className="space-y-3 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                    <Check size={14} style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all',
                  plan.popular
                    ? 'bg-violet-500 hover:bg-violet-400 text-white shadow-lg shadow-violet-500/25'
                    : 'border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5',
                )}>
                Boshlash <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Yirik loyihalar uchun{' '}
          <a href="mailto:sales@bizzo.uz" className="text-blue-400 hover:text-blue-300 transition-colors">
            sales@bizzo.uz
          </a>{' '}
          bilan bog'laning
        </p>
      </div>
    </section>
  )
}

// ============================================================
// FAQ
// ============================================================
function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const ITEMS = [
    { q: "BIZZO 1C dan qanday farqlanadi?", a: "1C — buxgalteriya va soliq hisobi uchun. BIZZO — real biznes jarayonlari uchun: ombor, mijozlar, savdo, xodimlar. Ikkalasi bir-birini to'ldiradi — ko'pchilik ikkalasini parallel ishlatadi." },
    { q: "Ma'lumotlarim xavfsizmi?", a: "Ha. Barcha ma'lumotlar O'zbekistondagi serverlarimizda saqlanadi. SSL shifrlash, kunlik backup, va qat'iy kirish nazorati ta'minlangan." },
    { q: "Mobil qurilmada ishlaydi?", a: "Ha, to'liq PWA qo'llab-quvvatlash. iOS va Android uchun uy ekraniga qo'shish mumkin. Maxsus mobil interfeys optimizatsiya qilingan." },
    { q: "Bir necha foydalanuvchi qo'shish mumkinmi?", a: "Ha. Har foydalanuvchiga alohida rol beriladi: Administrator, Menejer, Buxgalter, Omborchi, Sotuvchi. Har rol o'z sahifalariga kirish huquqiga ega." },
    { q: "Excel dan ma'lumotlar import qilinadi?", a: "Ha. Kontragentlar, mahsulotlar, qarzlar, xodimlar, omborxona — barchasini Excel yoki CSV orqali import qilish mumkin. 1C eksporti ham qo'llab-quvvatlanadi." },
    { q: "Tarif rejasini o'zgartirish mumkinmi?", a: "Ha, istalgan vaqt. Yuqoriga o'tishda qo'shimcha to'lov, pastga o'tishda esa keyingi davr boshidan yangi narx." },
  ]

  return (
    <section id="faq" className="py-24 bg-white/[0.01]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ko'p so'raladigan savollar</h2>
        </div>
        <div className="space-y-2">
          {ITEMS.map((item, i) => (
            <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left">
                <span className="text-sm font-medium text-white/80">{item.q}</span>
                <ChevronDown size={16} className={cn('text-white/30 shrink-0 ml-4 transition-transform', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-white/50 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// CTA
// ============================================================
function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="relative p-12 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-violet-500/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Bugun boshlang — bepul</h2>
            <p className="text-white/50 mb-8 text-lg">30 kun sinov muddati. Kredit karta shart emas.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white font-bold text-base transition-all shadow-2xl shadow-blue-500/30 hover:-translate-y-0.5">
                Bepul ro'yxatdan o'tish
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="tel:+998712345678" className="text-sm text-white/40 hover:text-white/70 transition-colors">
                Yoki qo'ng'iroq: +998 71 234 56 78
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Stats />
      <Features />
      <Modules />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  )
}
