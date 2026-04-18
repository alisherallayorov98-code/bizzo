import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2, Shield, BarChart3, Users, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

// ============================================
// VALIDATION
// ============================================
const loginSchema = z.object({
  email:    z.string().min(1, "Email kiritish majburiy").email("Email formati noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 ta belgi"),
})

type LoginFormData = z.infer<typeof loginSchema>

// ============================================
// DEMO CREDENTIALS (only in dev)
// ============================================
const DEMO_CREDENTIALS = [
  { role: 'Admin',    email: 'admin@demo.uz',    password: 'Admin123!' },
  { role: 'Manager',  email: 'manager@demo.uz',  password: 'Manager123!' },
  { role: 'Cashier',  email: 'cashier@demo.uz',  password: 'Cashier123!' },
]

// ============================================
// FEATURE LIST (left panel)
// ============================================
const FEATURES = [
  {
    icon:  <Building2 size={20} />,
    title: "Ko'p tarmoqli boshqaruv",
    desc:  "Barcha filiallar va omborlarni yagona tizimda boshqaring",
  },
  {
    icon:  <BarChart3 size={20} />,
    title: "Real vaqt hisobotlari",
    desc:  "Moliyaviy va savdo hisobotlari bir zumda tayyor",
  },
  {
    icon:  <Users size={20} />,
    title: "Xodimlar va ish haqi",
    desc:  "Har bir xodim uchun to'liq hisob-kitob tizimi",
  },
  {
    icon:  <Shield size={20} />,
    title: "Xavfsiz va ishonchli",
    desc:  "Bank darajasidagi shifrlash va RBAC tizimi",
  },
]

// ============================================
// COMPONENT
// ============================================
export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const t = useT()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormData) {
    try {
      await login(data)
    } catch {
      // Error useAuth ichida handled
    }
  }

  function fillDemo(email: string, password: string) {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
  }

  // Extract error message
  const errorMessage = loginError
    ? (loginError as any)?.response?.data?.message || "Xatolik yuz berdi"
    : null

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>

      {/* ==========================================
          LEFT PANEL — Brand & Features
          ========================================== */}
      <div
        className="hidden lg:flex"
        style={{
          flex:           '0 0 45%',
          flexDirection:  'column',
          padding:        'var(--space-10)',
          background:     'linear-gradient(160deg, #0d1526 0%, #0a0f1e 40%, #0d1526 100%)',
          position:       'relative',
          overflow:       'hidden',
          justifyContent: 'space-between',
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position:     'absolute',
            top:          '-120px',
            right:        '-120px',
            width:        '400px',
            height:       '400px',
            borderRadius: '50%',
            background:   'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position:     'absolute',
            bottom:       '-80px',
            left:         '-80px',
            width:        '300px',
            height:       '300px',
            borderRadius: '50%',
            background:   'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width:           '48px',
                height:          '48px',
                borderRadius:    'var(--radius-xl)',
                background:      'linear-gradient(135deg, var(--color-accent-primary) 0%, #6366f1 100%)',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                boxShadow:       'var(--shadow-glow-blue)',
                flexShrink:      0,
              }}
            >
              <span
                style={{
                  color:       '#fff',
                  fontSize:    '22px',
                  fontWeight:  '700',
                  fontFamily:  'var(--font-display)',
                }}
              >
                B
              </span>
            </div>
            <div>
              <p
                style={{
                  fontFamily:    'var(--font-display)',
                  fontSize:      'var(--text-xl)',
                  fontWeight:    '700',
                  color:         'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight:    1.1,
                }}
              >
                BiznesERP
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                O'zbekiston uchun ERP/CRM platforma
              </p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-8)' }}>
          <div>
            <h1
              style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'clamp(28px, 3vw, 40px)',
                fontWeight:    '700',
                color:         'var(--color-text-primary)',
                letterSpacing: '-0.03em',
                lineHeight:    1.15,
                marginBottom:  'var(--space-4)',
              }}
            >
              Biznesingizni{' '}
              <span
                style={{
                  background:        'linear-gradient(90deg, var(--color-accent-primary), #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                yangi darajaga
              </span>{' '}
              olib chiqing
            </h1>
            <p
              style={{
                fontSize:   'var(--text-base)',
                color:      'var(--color-text-secondary)',
                lineHeight: 1.7,
                maxWidth:   '380px',
              }}
            >
              Savdo, ombor, xodimlar va moliya — hammasi bitta qulay tizimda.
              O'zbek tiliga va mahalliy talablarga to'liq moslashgan.
            </p>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          'var(--space-3)',
                  padding:      'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background:   'rgba(255,255,255,0.03)',
                  border:       '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  style={{
                    color:     'var(--color-accent-primary)',
                    flexShrink: 0,
                    marginTop:  '2px',
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                    {f.title}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-disabled)' }}>
          © {new Date().getFullYear()} BiznesERP. Barcha huquqlar himoyalangan.
        </p>
      </div>

      {/* ==========================================
          RIGHT PANEL — Login Form
          ========================================== */}
      <div
        style={{
          flex:            1,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         'var(--space-8) var(--space-6)',
          backgroundColor: 'var(--color-bg-primary)',
          overflowY:       'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobile logo */}
          <div
            className="flex lg:hidden"
            style={{
              alignItems:    'center',
              gap:           'var(--space-2)',
              marginBottom:  'var(--space-8)',
            }}
          >
            <div
              style={{
                width:          '36px',
                height:         '36px',
                borderRadius:   'var(--radius-lg)',
                background:     'linear-gradient(135deg, var(--color-accent-primary) 0%, #6366f1 100%)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>B</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              BiznesERP
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2
              style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'var(--text-2xl)',
                fontWeight:    '700',
                color:         'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                marginBottom:  'var(--space-1)',
              }}
            >
              {t('auth.loginTitle')}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {/* Error alert */}
          {errorMessage && (
            <div
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          'var(--space-2)',
                padding:      'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background:   'rgba(239,68,68,0.08)',
                border:       '1px solid rgba(239,68,68,0.2)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <AlertCircle size={16} color="var(--color-danger-primary)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger-primary)' }}>
                {errorMessage}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display:       'block',
                    fontSize:      'var(--text-sm)',
                    fontWeight:    '500',
                    color:         'var(--color-text-secondary)',
                    marginBottom:  'var(--space-2)',
                  }}
                >
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@company.uz"
                  disabled={isLoggingIn}
                  {...register('email')}
                  style={{
                    width:         '100%',
                    padding:       'var(--space-3) var(--space-4)',
                    borderRadius:  'var(--radius-lg)',
                    border:        `1px solid ${errors.email ? 'var(--color-danger-primary)' : 'var(--color-border-primary)'}`,
                    background:    'var(--color-bg-secondary)',
                    color:         'var(--color-text-primary)',
                    fontSize:      'var(--text-sm)',
                    outline:       'none',
                    transition:    'border-color var(--transition-fast)',
                    boxSizing:     'border-box',
                  }}
                  onFocus={(e) => {
                    if (!errors.email) e.target.style.borderColor = 'var(--color-accent-primary)'
                  }}
                  onBlur={(e) => {
                    if (!errors.email) e.target.style.borderColor = 'var(--color-border-primary)'
                  }}
                />
                {errors.email && (
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-danger-primary)' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display:       'block',
                    fontSize:      'var(--text-sm)',
                    fontWeight:    '500',
                    color:         'var(--color-text-secondary)',
                    marginBottom:  'var(--space-2)',
                  }}
                >
                  {t('auth.password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={isLoggingIn}
                    {...register('password')}
                    style={{
                      width:         '100%',
                      padding:       'var(--space-3) 44px var(--space-3) var(--space-4)',
                      borderRadius:  'var(--radius-lg)',
                      border:        `1px solid ${errors.password ? 'var(--color-danger-primary)' : 'var(--color-border-primary)'}`,
                      background:    'var(--color-bg-secondary)',
                      color:         'var(--color-text-primary)',
                      fontSize:      'var(--text-sm)',
                      outline:       'none',
                      transition:    'border-color var(--transition-fast)',
                      boxSizing:     'border-box',
                    }}
                    onFocus={(e) => {
                      if (!errors.password) e.target.style.borderColor = 'var(--color-accent-primary)'
                    }}
                    onBlur={(e) => {
                      if (!errors.password) e.target.style.borderColor = 'var(--color-border-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position:   'absolute',
                      right:      '12px',
                      top:        '50%',
                      transform:  'translateY(-50%)',
                      background: 'none',
                      border:     'none',
                      padding:    '4px',
                      cursor:     'pointer',
                      color:      'var(--color-text-muted)',
                      display:    'flex',
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-danger-primary)' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width:          '100%',
                  padding:        'var(--space-3) var(--space-4)',
                  borderRadius:   'var(--radius-lg)',
                  background:     isLoggingIn
                    ? 'var(--color-accent-muted)'
                    : 'linear-gradient(135deg, var(--color-accent-primary) 0%, #4f46e5 100%)',
                  border:         'none',
                  color:          '#fff',
                  fontSize:       'var(--text-sm)',
                  fontWeight:     '600',
                  cursor:         isLoggingIn ? 'not-allowed' : 'pointer',
                  transition:     'all var(--transition-fast)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            'var(--space-2)',
                  boxShadow:      isLoggingIn ? 'none' : 'var(--shadow-glow-blue)',
                  marginTop:      'var(--space-2)',
                }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </button>
            </div>
          </form>

          {/* Demo credentials (dev only) */}
          {import.meta.env.DEV && (
            <div
              style={{
                marginTop:    'var(--space-8)',
                padding:      'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border:       '1px dashed var(--color-border-primary)',
                background:   'rgba(255,255,255,0.01)',
              }}
            >
              <p
                style={{
                  fontSize:     'var(--text-xs)',
                  fontWeight:   '600',
                  color:        'var(--color-text-muted)',
                  marginBottom: 'var(--space-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Demo ma'lumotlar (faqat dev)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => fillDemo(cred.email, cred.password)}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      padding:        'var(--space-2) var(--space-3)',
                      borderRadius:   'var(--radius-md)',
                      background:     'var(--color-bg-tertiary)',
                      border:         '1px solid var(--color-border-primary)',
                      cursor:         'pointer',
                      transition:     'border-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-primary)')}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {cred.role}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {cred.email}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-accent-primary)' }}>
                      To'ldirish →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p
            style={{
              marginTop:  'var(--space-8)',
              textAlign:  'center',
              fontSize:   'var(--text-xs)',
              color:      'var(--color-text-disabled)',
            }}
          >
            Muammo bo'lsa admin bilan bog'laning
          </p>
        </div>
      </div>
    </div>
  )
}
