import { Link } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Warehouse, Users, Wallet, TrendingDown, BarChart3,
  Brain, Trash2, HardHat, Factory, ShoppingCart,
  ArrowRight, Check, ChevronDown, Zap,
  Shield, Globe, Clock, Star,
} from 'lucide-react'
import { cn } from '@utils/cn'

// ============================================================
// CANVAS PARTICLE BACKGROUND
// ============================================================
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r:  Math.random() * 1.5 + 0.5,
        a:  Math.random() * 0.5 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.a})`
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - d / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// ============================================================
// 3D TILT CARD
// ============================================================
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const x = (e.clientX - left) / width  - 0.5
    const y = (e.clientY - top)  / height - 0.5
    el.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`
  }, [])

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)'
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn('transition-transform duration-200 ease-out', className)}
    >
      {children}
    </div>
  )
}

// ============================================================
// AURORA BLOBS
// ============================================================
function AuroraBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="aurora-blob" style={{
        width: 700, height: 700,
        top: '-15%', left: '-10%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
        animation: 'floatBlob1 18s ease-in-out infinite',
      }} />
      <div className="aurora-blob" style={{
        width: 600, height: 600,
        top: '40%', right: '-10%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        animation: 'floatBlob2 22s ease-in-out infinite',
      }} />
      <div className="aurora-blob" style={{
        width: 500, height: 500,
        bottom: '0%', left: '30%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        animation: 'floatBlob3 16s ease-in-out infinite',
      }} />
      <style>{`
        .aurora-blob { position: absolute; border-radius: 50%; filter: blur(60px); }
        @keyframes floatBlob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.1)} 66%{transform:translate(-30px,60px) scale(0.95)} }
        @keyframes floatBlob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.05)} 66%{transform:translate(40px,-50px) scale(1.1)} }
        @keyframes floatBlob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,-30px) scale(1.08)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes float3d { 0%,100%{transform:perspective(1000px) rotateX(2deg) rotateY(-3deg) translateY(0px)} 50%{transform:perspective(1000px) rotateX(-1deg) rotateY(3deg) translateY(-12px)} }
        @keyframes pulseGlow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes countUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        .gradient-text {
          background: linear-gradient(135deg, #818cf8 0%, #a78bfa 35%, #60a5fa 65%, #818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .glass { backdrop-filter: blur(16px); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .glass-strong { backdrop-filter: blur(24px); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); }
        .glow-blue { box-shadow: 0 0 40px rgba(99,102,241,0.3), 0 0 80px rgba(99,102,241,0.1); }
        .glow-purple { box-shadow: 0 0 40px rgba(139,92,246,0.3); }
        .btn-primary { background: linear-gradient(135deg, #4f46e5, #7c3aed); box-shadow: 0 8px 32px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.15); transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(79,70,229,0.5), inset 0 1px 0 rgba(255,255,255,0.15); }
        .dashboard-3d { animation: float3d 6s ease-in-out infinite; transform-origin: center bottom; }
        .stat-badge { animation: pulseGlow 3s ease-in-out infinite; }
        .hero-text { animation: fadeUp 1s ease-out both; }
        .hero-sub { animation: fadeUp 1s ease-out 0.2s both; }
        .hero-btns { animation: fadeUp 1s ease-out 0.4s both; }
        .hero-dashboard { animation: fadeUp 1s ease-out 0.6s both; }
      `}</style>
    </div>
  )
}

// ============================================================
// HERO
// ============================================================
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ zIndex: 1 }}>

        {/* Badge */}
        <div className="hero-text inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-8 cursor-default"
          style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
          <Zap size={13} className="animate-pulse" style={{ color: '#818cf8' }} />
          <span className="text-sm font-medium" style={{ color: '#a5b4fc' }}>
            O'zbekiston #1 biznes boshqaruv platformasi
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>YANGI</span>
        </div>

        {/* Heading */}
        <h1 className="hero-text text-5xl sm:text-6xl lg:text-8xl font-black leading-[1.05] mb-6 tracking-tight" style={{ animationDelay:'0.1s' }}>
          <span style={{ color: '#f1f5f9' }}>Biznesingizni</span>
          <br />
          <span className="gradient-text">aqlli boshqaring</span>
        </h1>

        <p className="hero-sub text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgba(241,245,249,0.55)' }}>
          Ombor, mijozlar, xodimlar, savdo, qarzlar — barchasi bir platformada.
          <br />
          <span style={{ color: 'rgba(165,180,252,0.7)' }}>AI tahlil, real-time bildirishnomalar va professional hisobotlar.</span>
        </p>

        {/* Buttons */}
        <div className="hero-btns flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link to="/register"
            className="btn-primary group flex items-center gap-2.5 px-9 py-4 rounded-2xl text-white font-bold text-base">
            Bepul boshlash
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#features"
            className="glass flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-base transition-all hover:-translate-y-0.5"
            style={{ color: 'rgba(241,245,249,0.6)' }}>
            Batafsil ko'rish
            <ChevronDown size={16} />
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm mb-16" style={{ color: 'rgba(148,163,184,0.6)' }}>
          {[
            { icon: Shield, text: "Ma'lumotlar xavfsiz" },
            { icon: Globe,  text: "O'zbekiston serverlari" },
            { icon: Clock,  text: '5 daqiqada boshlash' },
            { icon: Star,   text: 'Kredit kartasiz' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5">
              <item.icon size={13} style={{ color: '#818cf8' }} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* 3D Dashboard */}
        <div className="hero-dashboard relative">
          {/* Floating stat badges */}
          <div className="absolute -left-4 sm:-left-12 top-12 z-10 stat-badge" style={{ animationDelay:'0s' }}>
            <div className="glass-strong rounded-2xl px-4 py-3 text-left glow-blue" style={{ minWidth: 130 }}>
              <p className="text-[10px] mb-1" style={{ color: 'rgba(165,180,252,0.6)' }}>Bugungi savdo</p>
              <p className="text-lg font-black" style={{ color: '#a5b4fc' }}>+24.5M</p>
              <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.8)' }}>↑ 12% o'sish</p>
            </div>
          </div>

          <div className="absolute -right-4 sm:-right-12 top-8 z-10 stat-badge" style={{ animationDelay:'1.5s' }}>
            <div className="glass-strong rounded-2xl px-4 py-3 text-left glow-purple" style={{ minWidth: 130 }}>
              <p className="text-[10px] mb-1" style={{ color: 'rgba(216,180,254,0.6)' }}>Aktiv mijozlar</p>
              <p className="text-lg font-black" style={{ color: '#c4b5fd' }}>1,284</p>
              <p className="text-[10px]" style={{ color: 'rgba(52,211,153,0.8)' }}>↑ 8 yangi bugun</p>
            </div>
          </div>

          <div className="absolute -right-4 sm:-right-12 bottom-20 z-10 stat-badge" style={{ animationDelay:'3s' }}>
            <div className="glass-strong rounded-2xl px-4 py-3 text-left" style={{ minWidth: 120, boxShadow:'0 0 30px rgba(52,211,153,0.2)' }}>
              <p className="text-[10px] mb-1" style={{ color: 'rgba(110,231,183,0.6)' }}>Health Score</p>
              <p className="text-2xl font-black" style={{ color: '#34d399' }}>A+</p>
              <p className="text-[10px]" style={{ color: 'rgba(110,231,183,0.6)' }}>94/100</p>
            </div>
          </div>

          {/* Dashboard window */}
          <div className="dashboard-3d relative rounded-2xl overflow-hidden glow-blue"
            style={{ border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(8,12,28,0.9)' }}>
            {/* Window chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b"
              style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(4,8,18,0.8)' }}>
              <div className="flex gap-1.5">
                {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex-1 mx-4 h-6 rounded-lg flex items-center justify-center px-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>app.bizzo.uz/dashboard</span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(8,12,28,0.95) 0%, rgba(12,16,36,0.98) 100%)' }}>
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label:'Debitor',     value:'45.2M', c:'#34d399', bg:'rgba(52,211,153,0.08)'  },
                  { label:'Savdo',       value:'128.5M',c:'#818cf8', bg:'rgba(129,140,248,0.08)' },
                  { label:'Mahsulotlar', value:'248',   c:'#60a5fa', bg:'rgba(96,165,250,0.08)'  },
                  { label:'Xodimlar',    value:'32',    c:'#c084fc', bg:'rgba(192,132,252,0.08)' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background:s.bg, border:`1px solid ${s.c}15` }}>
                    <p className="text-[9px] mb-1.5" style={{ color:'rgba(148,163,184,0.5)' }}>{s.label}</p>
                    <p className="text-base font-black" style={{ color:s.c }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Bar chart */}
                <div className="col-span-2 rounded-xl p-3 h-28 flex flex-col"
                  style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[9px] mb-2" style={{ color:'rgba(148,163,184,0.4)' }}>Oylik savdo dinamikasi</p>
                  <div className="flex-1 flex items-end gap-1">
                    {[35,55,42,70,48,85,62,78,55,92,70,100].map((h,i) => (
                      <div key={i} className="flex-1 rounded-t min-w-0"
                        style={{ height:`${h}%`, background:`linear-gradient(to top, rgba(79,70,229,0.9), rgba(139,92,246,0.7))`, opacity: 0.8 }} />
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div className="rounded-xl p-3 h-28 flex flex-col items-center justify-center"
                  style={{ background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.1)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
                    style={{ background:'rgba(52,211,153,0.1)', border:'2px solid rgba(52,211,153,0.3)' }}>
                    <span className="text-xl font-black" style={{ color:'#34d399' }}>A</span>
                  </div>
                  <p className="text-[9px]" style={{ color:'rgba(52,211,153,0.6)' }}>Business Score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Glow under dashboard */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 blur-2xl rounded-full"
            style={{ background:'rgba(79,70,229,0.3)' }} />
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
    <section className="relative py-16" style={{ zIndex: 1 }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="glass rounded-3xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+',  label: 'Faol kompaniyalar', color: '#818cf8' },
              { value: '4.9★',  label: 'Foydalanuvchi bahosi', color: '#f59e0b' },
              { value: '99.9%', label: 'Uptime kafolati', color: '#34d399' },
              { value: '24/7',  label: 'Texnik yordam', color: '#60a5fa' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// FEATURES
// ============================================================
function Features() {
  const FEATURES = [
    { icon: Warehouse,   color: '#818cf8', title: 'Ombor boshqaruvi',    desc: "Tovar kirim-chiqim, minimal qoldiq ogohlantirish, inventarizatsiya. Real-time kuzatuv.", items: ["Kirim/chiqim hujjatlari", "Minimal qoldiq ogohlantirish", "Ko'p omborxona", "Inventarizatsiya"] },
    { icon: Users,       color: '#c084fc', title: 'Mijozlar 360°',       desc: "Har mijozning to'liq tarixi — xaridlar, qarzlar, bitimlar bir ekranda.", items: ["360° mijoz kartasi", "STIR bo'yicha qidirish", "Qarz tarixi", "Debitor/kreditor balans"] },
    { icon: TrendingDown,color: '#f59e0b', title: 'Qarzlar tizimi',      desc: "Debitor va kreditor qarzlar, muddati o'tgan uchun avtomatik eslatma.", items: ["Muddati o'tgan eslatma", "Qarz tarixi", "To'lov qabul qilish", "SMS/Telegram xabar"] },
    { icon: Wallet,      color: '#34d399', title: 'Xodimlar va ish haqi', desc: "Oylik va kunlik ishchilar, avans, bonus, jarima — to'liq ish haqi tizimi.", items: ["Oylik va kunlik hisob", "Avans boshqaruvi", "Ommaviy to'lash", "Oylik hisobot"] },
    { icon: Brain,       color: '#f472b6', title: 'AI Smart Tahlil',     desc: "ABC tahlil, RFM segmentatsiya, savdo bashorati, HealthScore.", items: ["ABC tahlil (mahsulot)", "RFM (mijozlar)", "Savdo bashorati", "Biznes HealthScore"] },
    { icon: BarChart3,   color: '#60a5fa', title: 'Hisobotlar',          desc: "Moliyaviy hisobot, ombor, xodimlar, savdo — Excel va PDF eksport.", items: ["Moliyaviy P&L", "Ombor hisoboti", "Xodimlar hisoboti", "Excel/PDF eksport"] },
  ]

  return (
    <section id="features" className="relative py-24" style={{ zIndex: 1 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#818cf8' }}>Imkoniyatlar</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4" style={{ color:'#f1f5f9' }}>Biznes uchun hamma narsa</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color:'rgba(148,163,184,0.6)' }}>
            Excel jadvallari va daftarlardan chiqing. BIZZO bilan barchasi avtomatik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(feat => (
            <TiltCard key={feat.title}>
              <div className="h-full p-6 rounded-2xl glass hover:glass-strong transition-all duration-300 hover:-translate-y-1 group cursor-default">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background:`${feat.color}15`, border:`1px solid ${feat.color}25`, boxShadow:`0 0 20px ${feat.color}15` }}>
                  <feat.icon size={22} style={{ color: feat.color }} />
                </div>

                <h3 className="text-base font-bold mb-2" style={{ color:'#f1f5f9' }}>{feat.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color:'rgba(148,163,184,0.55)' }}>{feat.desc}</p>

                <ul className="space-y-2">
                  {feat.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs" style={{ color:'rgba(148,163,184,0.5)' }}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: feat.color }} />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Bottom glow on hover */}
                <div className="absolute inset-x-0 bottom-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background:`linear-gradient(to right, transparent, ${feat.color}50, transparent)` }} />
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// MODULES
// ============================================================
function Modules() {
  const MODULES = [
    { icon: Trash2,       name: 'Chiqindi qayta ishlash', desc: 'Chiqindi partiyalari, ishchilar hisobi, yo\'qotish tahlili',  color: '#7c3aed' },
    { icon: ShoppingCart, name: 'Savdo (CRM)',             desc: 'Pipeline, bitimlar, hisob-faktura, taklifnoma',               color: '#2563eb' },
    { icon: HardHat,      name: 'Qurilish',               desc: 'Loyihalar, byudjet, materiallar, kunlik ish logi',            color: '#d97706' },
    { icon: Factory,      name: 'Ishlab chiqarish',        desc: 'Retseptlar, partiyalar, xom ashyo nazorati, bashorat',        color: '#dc2626' },
  ]

  return (
    <section id="modules" className="relative py-24" style={{ zIndex: 1 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#a78bfa' }}>Modullar</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4" style={{ color:'#f1f5f9' }}>Sizning soha uchun</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color:'rgba(148,163,184,0.6)' }}>
            Asosiy platformaga qo'shimcha modullar — faqat keraklilarini ulang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULES.map(mod => (
            <TiltCard key={mod.name}>
              <div className="flex gap-5 p-6 rounded-2xl glass-strong hover:-translate-y-1 transition-all duration-300 cursor-default group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background:`${mod.color}15`, border:`1px solid ${mod.color}30`, boxShadow:`0 0 24px ${mod.color}20` }}>
                  <mod.icon size={24} style={{ color: mod.color }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1.5" style={{ color:'#f1f5f9' }}>{mod.name}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:'rgba(148,163,184,0.55)' }}>{mod.desc}</p>
                </div>
              </div>
            </TiltCard>
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
      name:'Starter', price:'199 000', desc:'Kichik biznes uchun', color:'#60a5fa', popular:false,
      features:['3 foydalanuvchi','Ombor','Mijozlar','Qarzlar','Hisobotlar'],
    },
    {
      name:'Business', price:'399 000', desc:"O'rta va katta biznes", color:'#a78bfa', popular:true,
      features:['10 foydalanuvchi','Barcha asosiy funksiyalar','1 ta modul','AI tahlil','SMS/Telegram'],
    },
    {
      name:'Pro', price:'799 000', desc:'Korporativ mijozlar uchun', color:'#f472b6', popular:false,
      features:['Cheksiz foydalanuvchi','Barcha funksiyalar','Barcha modullar','API kirish','Ustuvor yordam'],
    },
  ]

  return (
    <section id="pricing" className="relative py-24" style={{ zIndex: 1 }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#60a5fa' }}>Narxlar</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-4" style={{ color:'#f1f5f9' }}>Oddiy va shaffof</h2>
          <p style={{ color:'rgba(148,163,184,0.6)' }}>30 kun bepul sinab ko'ring — karta kerak emas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <TiltCard key={plan.name} className="flex">
              <div className={cn(
                'relative flex flex-col w-full p-7 rounded-2xl transition-all duration-300',
                plan.popular ? 'glass-strong' : 'glass',
              )} style={plan.popular ? {
                border:`1px solid ${plan.color}40`,
                boxShadow:`0 0 60px ${plan.color}20, 0 0 120px ${plan.color}10`,
              } : {}}>

                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold"
                    style={{ background:`linear-gradient(135deg, ${plan.color}, #7c3aed)`, boxShadow:`0 4px 16px ${plan.color}40` }}>
                    ⭐ Mashhur
                  </div>
                )}

                <div className="mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background:`${plan.color}15`, border:`1px solid ${plan.color}25` }}>
                    <Star size={18} style={{ color: plan.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-1" style={{ color:'#f1f5f9' }}>{plan.name}</h3>
                  <p className="text-sm" style={{ color:'rgba(148,163,184,0.5)' }}>{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 my-5 pb-5 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                  <span className="text-3xl font-black" style={{ color: plan.color }}>{plan.price}</span>
                  <span className="text-sm" style={{ color:'rgba(148,163,184,0.4)' }}>so'm/oy</span>
                </div>

                <ul className="space-y-3 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color:'rgba(241,245,249,0.6)' }}>
                      <Check size={14} style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5"
                  style={plan.popular ? {
                    background:`linear-gradient(135deg, ${plan.color}, #7c3aed)`,
                    color:'#fff',
                    boxShadow:`0 8px 24px ${plan.color}30`,
                  } : {
                    border:`1px solid ${plan.color}30`,
                    color: plan.color,
                  }}>
                  Boshlash <ArrowRight size={14} />
                </Link>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// FAQ
// ============================================================
function FAQ() {
  const [open, setOpen] = useState<number|null>(null)
  const ITEMS = [
    { q:"BIZZO 1C dan qanday farqlanadi?",       a:"1C — buxgalteriya va soliq hisobi uchun. BIZZO — real biznes jarayonlari uchun: ombor, mijozlar, savdo, xodimlar. Ko'pchilik ikkalasini parallel ishlatadi." },
    { q:"Ma'lumotlarim xavfsizmi?",              a:"Ha. Barcha ma'lumotlar O'zbekistondagi serverlarimizda saqlanadi. SSL shifrlash, kunlik backup, va qat'iy kirish nazorati ta'minlangan." },
    { q:"Mobil qurilmada ishlaydi?",             a:"Ha, to'liq PWA qo'llab-quvvatlash. iOS va Android uchun uy ekraniga qo'shish mumkin. Maxsus mobil interfeys optimizatsiya qilingan." },
    { q:"Bir necha foydalanuvchi bo'ladimi?",    a:"Ha. Har foydalanuvchiga alohida rol beriladi: Administrator, Menejer, Buxgalter, Omborchi, Sotuvchi. Har rol o'z sahifalariga kirish huquqiga ega." },
    { q:"Excel dan ma'lumotlar import qilinadi?",a:"Ha. Kontragentlar, mahsulotlar, qarzlar, xodimlar — barchasini Excel yoki CSV orqali import qilish mumkin. 1C eksporti ham qo'llab-quvvatlanadi." },
    { q:"Tarif rejasini o'zgartirish mumkinmi?", a:"Ha, istalgan vaqt. Yuqoriga o'tishda qo'shimcha to'lov, pastga o'tishda esa keyingi davr boshidan yangi narx." },
  ]

  return (
    <section id="faq" className="relative py-24" style={{ zIndex: 1 }}>
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color:'#f1f5f9' }}>Ko'p so'raladigan savollar</h2>
        </div>
        <div className="space-y-2">
          {ITEMS.map((item,i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden transition-all hover:glass-strong">
              <button onClick={() => setOpen(open===i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left gap-4">
                <span className="text-sm font-medium" style={{ color:'rgba(241,245,249,0.8)' }}>{item.q}</span>
                <ChevronDown size={16} className={cn('shrink-0 transition-transform duration-300', open===i && 'rotate-180')}
                  style={{ color:'rgba(129,140,248,0.6)' }} />
              </button>
              {open===i && (
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color:'rgba(148,163,184,0.6)' }}>{item.a}</p>
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
    <section className="relative py-24" style={{ zIndex: 1 }}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        <TiltCard>
          <div className="relative p-12 sm:p-16 rounded-3xl overflow-hidden glass-strong"
            style={{ border:'1px solid rgba(99,102,241,0.3)', boxShadow:'0 0 80px rgba(79,70,229,0.2), 0 0 160px rgba(79,70,229,0.08)' }}>

            {/* Inner glow orbs */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
              style={{ background:'rgba(139,92,246,0.15)' }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
              style={{ background:'rgba(79,70,229,0.15)' }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)' }}>
                <Zap size={12} style={{ color:'#818cf8' }} />
                <span className="text-xs font-semibold" style={{ color:'#a5b4fc' }}>30 kun bepul sinov</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black mb-4" style={{ color:'#f1f5f9' }}>
                Bugun boshlang — <span className="gradient-text">bepul</span>
              </h2>
              <p className="mb-10 text-lg" style={{ color:'rgba(148,163,184,0.55)' }}>
                Kredit karta shart emas. Istalgan vaqt bekor qilish mumkin.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register"
                  className="btn-primary group flex items-center gap-2.5 px-10 py-4 rounded-2xl text-white font-bold text-base">
                  Bepul ro'yxatdan o'tish
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="tel:+998712345678" className="text-sm transition-colors hover:underline"
                  style={{ color:'rgba(148,163,184,0.5)' }}>
                  Yoki qo'ng'iroq: +998 71 234 56 78
                </a>
              </div>
            </div>
          </div>
        </TiltCard>
      </div>
    </section>
  )
}

// ============================================================
// MAIN
// ============================================================
export default function LandingPage() {
  return (
    <div style={{ background:'#060b18', minHeight:'100vh' }}>
      <AuroraBlobs />
      <ParticleCanvas />
      <div className="relative" style={{ zIndex: 1 }}>
        <Hero />
        <Stats />
        <Features />
        <Modules />
        <Pricing />
        <FAQ />
        <CTA />
      </div>
    </div>
  )
}
