import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, ChevronRight, X, Sparkles, Building2, Package,
  Users, Database, ArrowRight, Warehouse, ShoppingCart, Brain,
  LayoutDashboard, UserRound, Factory,
} from 'lucide-react'
import { Button } from '@components/ui/Button/Button'
import { Input }  from '@components/ui/Input/Input'
import { cn }     from '@utils/cn'
import { useOnboardingStore } from '@store/onboarding.store'
import { useUpdateCompany }   from '@features/settings/hooks/useSettings'
import { useCreateProduct }   from '@features/products/hooks/useProducts'
import { useCreateContact }   from '@features/contacts/hooks/useContacts'
import api from '@config/api'
import toast from 'react-hot-toast'

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    { Icon: Warehouse,       title: 'Ombor',     desc: 'Mahsulotlar va qoldiqlar' },
    { Icon: UserRound,       title: 'Mijozlar',  desc: 'Kontaktlar bazasi'        },
    { Icon: ShoppingCart,    title: 'Savdo',     desc: 'Pipeline va deallar'       },
    { Icon: Brain,           title: 'AI tahlil', desc: 'Aqlli tavsiyalar'          },
  ]
  return (
    <div className="text-center space-y-6 py-4">
      <div className="relative inline-block">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center mx-auto shadow-glow animate-bounce-in">
          <span className="text-white font-black text-4xl font-display">B</span>
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center animate-bounce-in">
          <Sparkles size={16} className="text-white" />
        </div>
      </div>
      <div>
        <h2 className="font-display font-black text-2xl text-text-primary mb-2">BIZZO ga xush kelibsiz!</h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
          O'zbekiston biznesini boshqarishning eng aqlli platformasi. Ombor, mijozlar, xodimlar, savdo bir joyda.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left">
        {features.map(f => (
          <div key={f.title} className="flex items-start gap-2.5 p-3 rounded-xl bg-bg-tertiary border border-border-primary">
            <f.Icon size={20} className="text-accent-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-text-primary">{f.title}</p>
              <p className="text-[10px] text-text-muted">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Button variant="primary" size="lg" fullWidth rightIcon={<ArrowRight size={16} />} onClick={onNext}>
        Boshlaylik
      </Button>
    </div>
  )
}

function CompanyStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: '', stir: '', taxRegime: 'GENERAL' })
  const updateCompany = useUpdateCompany()

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Kompaniya nomini kiriting')
    await updateCompany.mutateAsync(form as any)
    onNext()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center">
          <Building2 size={20} className="text-accent-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-text-primary">Kompaniya ma'lumotlari</h3>
          <p className="text-xs text-text-muted">Keyinchalik sozlamalarda o'zgartirish mumkin</p>
        </div>
      </div>
      <Input label="Kompaniya nomi *" placeholder="Toshmatov Savdo MChJ" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      <Input label="STIR (ixtiyoriy)" placeholder="123456789" value={form.stir} onChange={e => setForm(f => ({ ...f, stir: e.target.value }))} hint="9 ta raqam" />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-secondary">Soliq rejimi</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: 'GENERAL', label: 'Umumiy (QQS)' }, { value: 'SIMPLIFIED', label: 'Soddalashtirilgan' }].map(opt => (
            <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, taxRegime: opt.value }))}
              className={cn('py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center',
                form.taxRegime === opt.value ? 'border-accent-primary bg-accent-subtle text-accent-primary' : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onSkip}>O'tkazib yuborish</Button>
        <Button variant="primary" size="sm" fullWidth loading={updateCompany.isPending} rightIcon={<ChevronRight size={14} />} onClick={handleSave}>
          Saqlash
        </Button>
      </div>
    </div>
  )
}

function ProductStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: '', unit: 'dona', sellPrice: '', buyPrice: '' })
  const createProduct = useCreateProduct()
  const UNITS = ['dona', 'kg', 'litr', 'm', 'm2', 'tonna', 'qop']

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Mahsulot nomini kiriting')
    await createProduct.mutateAsync({
      name: form.name, unit: form.unit,
      sellPrice: parseFloat(form.sellPrice) || 0,
      buyPrice:  parseFloat(form.buyPrice)  || 0,
    } as any)
    onNext()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
          <Package size={20} className="text-warning" />
        </div>
        <div>
          <h3 className="font-display font-bold text-text-primary">Birinchi mahsulot</h3>
          <p className="text-xs text-text-muted">Katalogga qo'shing</p>
        </div>
      </div>
      <Input label="Mahsulot nomi *" placeholder="Polipropilen qop 50kg" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-secondary">O'lchov birligi</label>
        <div className="flex flex-wrap gap-2">
          {UNITS.map(u => (
            <button key={u} type="button" onClick={() => setForm(f => ({ ...f, unit: u }))}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                form.unit === u ? 'border-accent-primary bg-accent-subtle text-accent-primary' : 'border-border-primary text-text-secondary')}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Xarid narxi (so'm)" type="number" placeholder="0" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} />
        <Input label="Sotish narxi (so'm)" type="number" placeholder="0" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onSkip}>O'tkazib yuborish</Button>
        <Button variant="primary" size="sm" fullWidth loading={createProduct.isPending} rightIcon={<ChevronRight size={14} />} onClick={handleSave}>
          Saqlash
        </Button>
      </div>
    </div>
  )
}

function ContactStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER' })
  const createContact = useCreateContact()

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Kontakt nomini kiriting')
    await createContact.mutateAsync(form as any)
    onNext()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
          <Users size={20} className="text-success" />
        </div>
        <div>
          <h3 className="font-display font-bold text-text-primary">Birinchi mijoz</h3>
          <p className="text-xs text-text-muted">Kontaktlar bazasiga qo'shing</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {[
          { value: 'CUSTOMER' as const, Icon: UserRound, label: 'Mijoz'       },
          { value: 'SUPPLIER' as const, Icon: Factory,   label: 'Yetkazuvchi' },
        ].map(opt => (
          <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, type: opt.value }))}
            className={cn('py-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2',
              form.type === opt.value ? 'border-accent-primary bg-accent-subtle text-accent-primary' : 'border-border-primary text-text-secondary')}>
            <opt.Icon size={14} />
            {opt.label}
          </button>
        ))}
      </div>
      <Input label="Ism yoki kompaniya *" placeholder="Abdullayev Jamshid" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      <Input label="Telefon" type="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onSkip}>O'tkazib yuborish</Button>
        <Button variant="primary" size="sm" fullWidth loading={createContact.isPending} rightIcon={<ChevronRight size={14} />} onClick={handleSave}>
          Saqlash
        </Button>
      </div>
    </div>
  )
}

function DemoStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [loading, setLoading] = useState(false)
  const loadDemo = async () => {
    setLoading(true)
    try {
      await api.post('/onboarding/load-demo')
      toast.success('Demo ma\'lumotlar yuklandi')
      onNext()
    } catch {
      toast.error('Demo yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Database size={20} className="text-purple-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-text-primary">Demo ma'lumotlar</h3>
          <p className="text-xs text-text-muted">Tizimni sinab ko'ring</p>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary space-y-2">
        <p className="text-sm font-medium text-text-primary mb-2">Qo'shiladi:</p>
        {[
          '3 ta mahsulot (qoplar, granulalar)',
          '2 ta mijoz va 1 ta yetkazuvchi',
          'Qisqa test bazasi',
        ].map(item => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle size={13} className="text-success shrink-0" />
            <span className="text-xs text-text-secondary">{item}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted text-center">Demo ma'lumotlarni keyinchalik o'chirish mumkin</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onSkip}>O'tkazib yuborish</Button>
        <Button variant="primary" size="sm" fullWidth loading={loading} leftIcon={loading ? undefined : <Database size={14} />} onClick={loadDemo}>
          Demo yuklash
        </Button>
      </div>
    </div>
  )
}

function FinishStep({ onComplete }: { onComplete: () => void }) {
  const quickLinks = [
    { Icon: LayoutDashboard, label: 'Dashboard' },
    { Icon: Users,           label: 'Mijozlar'  },
    { Icon: ShoppingCart,    label: 'Savdo'     },
  ]
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto animate-bounce-in">
        <CheckCircle size={40} className="text-success" />
      </div>
      <div>
        <h2 className="font-display font-black text-2xl text-text-primary mb-2">BIZZO tayyor!</h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
          Biznesingizni boshqarishni hoziroq boshlang. Savol bo'lsa AI yordamchiga murojaat qiling.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {quickLinks.map(q => (
          <div key={q.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-bg-tertiary">
            <q.Icon size={22} className="text-accent-primary" />
            <span className="text-xs font-medium text-text-secondary">{q.label}</span>
          </div>
        ))}
      </div>
      <Button variant="primary" size="lg" fullWidth rightIcon={<ArrowRight size={16} />} onClick={onComplete}>
        Dashboardga o'tish
      </Button>
    </div>
  )
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const {
    isActive, currentStep, steps,
    completeStep, skipStep, nextStep,
    completeOnboarding, dismissOnboarding,
  } = useOnboardingStore()

  if (!isActive) return null

  const handleNext = (stepId?: string) => {
    if (stepId) completeStep(stepId)
    if (currentStep < steps.length - 1) {
      nextStep()
    } else {
      completeOnboarding()
      navigate('/dashboard')
    }
  }

  const handleSkip = (stepId: string) => {
    skipStep(stepId)
    handleNext()
  }

  const stepComponents = [
    <WelcomeStep key="welcome" onNext={() => handleNext('welcome')} />,
    <CompanyStep key="company" onNext={() => handleNext('company')} onSkip={() => handleSkip('company')} />,
    <ProductStep key="product" onNext={() => handleNext('product')} onSkip={() => handleSkip('product')} />,
    <ContactStep key="contact" onNext={() => handleNext('contact')} onSkip={() => handleSkip('contact')} />,
    <DemoStep    key="demo"    onNext={() => handleNext('demo')}    onSkip={() => handleSkip('demo')}    />,
    <FinishStep  key="finish"  onComplete={() => { completeOnboarding(); navigate('/dashboard') }} />,
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md mx-4 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <div key={step.id} className={cn('transition-all duration-300',
                i === currentStep                       ? 'w-6 h-2 rounded-full bg-accent-primary'
                : i < currentStep || step.isCompleted   ? 'w-2 h-2 rounded-full bg-success'
                :                                         'w-2 h-2 rounded-full bg-border-secondary',
              )} />
            ))}
          </div>
          <span className="text-xs text-text-muted">{currentStep + 1} / {steps.length}</span>
          <button onClick={dismissOnboarding}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {stepComponents[currentStep]}
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
