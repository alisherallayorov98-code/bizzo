import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@components/ui/Modal/Modal'
import { Button } from '@components/ui/Button/Button'
import { Input, Textarea } from '@components/ui/Input/Input'
import { cn } from '@utils/cn'
import type { Contact } from '@services/contact.service'
import { useCreateContact, useUpdateContact } from '../hooks/useContacts'
import { useT } from '@i18n/index'

// ============================================
// VALIDATSIYA
// ============================================
const schema = z.object({
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH', 'PARTNER'], {
    required_error: 'Kontakt turini tanlang',
  }),
  name: z.string()
    .min(2,   'Ism kamida 2 ta belgi')
    .max(100, 'Ism juda uzun'),
  legalName:   z.string().max(200).optional().or(z.literal('')),
  stir:        z.string().max(20).optional().or(z.literal('')),
  phone:       z.string().max(20).optional().or(z.literal('')),
  phone2:      z.string().max(20).optional().or(z.literal('')),
  email:       z.string().email("Email noto'g'ri").optional().or(z.literal('')),
  address:     z.string().max(300).optional().or(z.literal('')),
  region:      z.string().max(100).optional().or(z.literal('')),
  notes:       z.string().max(1000).optional().or(z.literal('')),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentDays: z.coerce.number().min(0).max(365).optional(),
  priceLevel:  z.enum(['RETAIL', 'WHOLESALE', 'VIP']).default('RETAIL'),
})

type FormData = z.infer<typeof schema>

// ============================================
// KONTAKT TURLARI
// ============================================
const CONTACT_TYPES = [
  { value: 'CUSTOMER' as const, label: 'Mijoz',              dot: 'bg-success' },
  { value: 'SUPPLIER' as const, label: 'Yetkazuvchi',        dot: 'bg-warning' },
  { value: 'BOTH'     as const, label: 'Mijoz/Yetkazuvchi',  dot: 'bg-info'    },
  { value: 'PARTNER'  as const, label: 'Sherik',             dot: 'bg-accent-primary' },
]

// ============================================
// PROPS
// ============================================
interface ContactFormModalProps {
  open:     boolean
  onClose:  () => void
  contact?: Contact | null
}

// ============================================
// MODAL
// ============================================
export function ContactFormModal({ open, onClose, contact }: ContactFormModalProps) {
  const t = useT()
  const isEdit = !!contact
  const create = useCreateContact()
  const update = useUpdateContact()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { type: 'CUSTOMER', creditLimit: 0, paymentDays: 0, priceLevel: 'RETAIL' },
  })

  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          type:        contact.type,
          name:        contact.name,
          legalName:   contact.legalName   ?? '',
          stir:        contact.stir        ?? '',
          phone:       contact.phone       ?? '',
          phone2:      contact.phone2      ?? '',
          email:       contact.email       ?? '',
          address:     contact.address     ?? '',
          region:      contact.region      ?? '',
          notes:       contact.notes       ?? '',
          creditLimit: contact.creditLimit ?? 0,
          paymentDays: contact.paymentDays ?? 0,
          priceLevel:  (contact as any).priceLevel ?? 'RETAIL',
        })
      } else {
        reset({ type: 'CUSTOMER', creditLimit: 0, paymentDays: 0, priceLevel: 'RETAIL' })
      }
    }
  }, [open, contact, reset])

  const onSubmit = async (data: FormData) => {
    // Bo'sh stringlarni undefined ga aylantirish
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as any

    if (isEdit) {
      await update.mutateAsync({ id: contact!.id, data: cleaned })
    } else {
      await create.mutateAsync(cleaned)
    }
    onClose()
  }

  const selectedType  = watch('type')
  const selectedLevel = watch('priceLevel')
  const isBusy = isSubmitting || create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('contacts.editContact') : t('contacts.newContact')}
      description={isEdit ? contact?.name : "Yangi mijoz yoki yetkazuvchi qo'shing"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isBusy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={isBusy}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* Kontakt turi */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Kontakt turi <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CONTACT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('type', t.value, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium',
                  'transition-all duration-150',
                  selectedType === t.value
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-primary bg-bg-tertiary text-text-secondary hover:border-border-secondary',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', t.dot)} />
                {t.label}
              </button>
            ))}
          </div>
          {errors.type && (
            <p className="text-xs text-danger">{errors.type.message}</p>
          )}
        </div>

        {/* Ism va Yuridik nom */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('contacts.fullName')}
            placeholder="Toshmatov Alisher"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input
            label={t('contacts.legalName')}
            placeholder="Toshmatov va Sheriklar MChJ"
            {...register('legalName')}
          />
        </div>

        {/* STIR va Viloyat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('contacts.inn')}
            placeholder="123456789"
            hint="9 ta raqam"
            {...register('stir')}
          />
          <Input
            label={t('contacts.region')}
            placeholder="Toshkent"
            {...register('region')}
          />
        </div>

        {/* Telefon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('common.phone')}
            type="tel"
            placeholder="+998 90 123 45 67"
            {...register('phone')}
          />
          <Input
            label={t('contacts.additionalPhone')}
            type="tel"
            placeholder="+998 90 123 45 67"
            {...register('phone2')}
          />
        </div>

        {/* Email */}
        <Input
          label={t('common.email')}
          type="email"
          placeholder="email@example.uz"
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Manzil */}
        <Input
          label={t('contacts.address')}
          placeholder="Toshkent sh., Yunusobod t., 5-ko'cha, 12-uy"
          {...register('address')}
        />

        {/* Moliyaviy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-primary">
          <Input
            label={t('contacts.creditLimit')}
            type="number"
            placeholder="5 000 000"
            hint="0 = limit yo'q"
            {...register('creditLimit')}
          />
          <Input
            label={t('contacts.paymentTerm')}
            type="number"
            placeholder="30"
            hint="0 = muddatsiz"
            {...register('paymentDays')}
          />
        </div>

        {/* Narx darajasi */}
        <div className="space-y-1.5 pt-2 border-t border-border-primary">
          <label className="text-xs font-medium text-text-secondary">Narx darajasi</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'RETAIL',    label: 'Chakana',  desc: 'Oddiy narx',   color: 'border-blue-500 bg-blue-500/10 text-blue-500'       },
              { value: 'WHOLESALE', label: 'Ulgurji',  desc: '~15-20% arzon', color: 'border-green-500 bg-green-500/10 text-green-500'   },
              { value: 'VIP',       label: 'VIP',      desc: 'Eng past narx', color: 'border-violet-500 bg-violet-500/10 text-violet-500' },
            ] as const).map(level => (
              <button
                key={level.value}
                type="button"
                onClick={() => setValue('priceLevel', level.value)}
                className={cn(
                  'py-2.5 px-3 rounded-xl border-2 text-xs transition-all',
                  selectedLevel === level.value
                    ? level.color
                    : 'border-border-primary text-text-muted hover:border-border-secondary',
                )}
              >
                <p className="font-bold">{level.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Izoh */}
        <Textarea
          label={t('contacts.note')}
          placeholder="Qo'shimcha ma'lumotlar..."
          rows={3}
          {...register('notes')}
        />
      </form>
    </Modal>
  )
}
