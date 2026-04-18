import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { PageHeader }     from '@components/layout/PageHeader/PageHeader'
import { Card }           from '@components/ui/Card/Card'
import { Button }         from '@components/ui/Button/Button'
import { Input, Textarea } from '@components/ui/Input/Input'
import { Skeleton }       from '@components/ui/Skeleton/Skeleton'
import { useContact, useCreateContact, useUpdateContact } from '@features/contacts/hooks/useContacts'
import { useT }           from '@i18n/index'
import { cn }             from '@utils/cn'

// ============================================
// VALIDATSIYA
// ============================================
const schema = z.object({
  type:        z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH', 'PARTNER']),
  name:        z.string().min(2, 'Kamida 2 ta belgi').max(100, 'Juda uzun'),
  legalName:   z.string().max(200).optional().or(z.literal('')),
  stir:        z.string().max(20).optional().or(z.literal('')),
  phone:       z.string().max(20).optional().or(z.literal('')),
  phone2:      z.string().max(20).optional().or(z.literal('')),
  email:       z.string().email('Email noto\'g\'ri').optional().or(z.literal('')),
  address:     z.string().max(300).optional().or(z.literal('')),
  region:      z.string().max(100).optional().or(z.literal('')),
  notes:       z.string().max(1000).optional().or(z.literal('')),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentDays: z.coerce.number().min(0).max(365).optional(),
})

type FormData = z.infer<typeof schema>

const CONTACT_TYPES = [
  { value: 'CUSTOMER' as const, dot: 'bg-success'         },
  { value: 'SUPPLIER' as const, dot: 'bg-warning'         },
  { value: 'BOTH'     as const, dot: 'bg-info'            },
  { value: 'PARTNER'  as const, dot: 'bg-accent-primary'  },
]

// ============================================
// SAHIFA
// ============================================
export default function ContactFormPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const t         = useT()
  const isEdit    = !!id

  const { data: contact, isLoading: isLoadingContact } = useContact(id ?? '')
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
    defaultValues: { type: 'CUSTOMER', creditLimit: 0, paymentDays: 0 },
  })

  useEffect(() => {
    if (isEdit && contact) {
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
      })
    }
  }, [isEdit, contact, reset])

  const onSubmit = async (data: FormData) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as any

    if (isEdit && contact) {
      await update.mutateAsync({ id: contact.id, data: cleaned })
      navigate(`/contacts/${contact.id}`)
    } else {
      const created = await create.mutateAsync(cleaned)
      navigate(`/contacts/${created.id}`)
    }
  }

  const selectedType = watch('type')
  const isBusy = isSubmitting || create.isPending || update.isPending

  const TYPE_LABELS: Record<string, string> = {
    CUSTOMER: t('contacts.customer'),
    SUPPLIER: t('contacts.supplier'),
    BOTH:     `${t('contacts.customer')}/${t('contacts.supplier')}`,
    PARTNER:  t('contacts.partner'),
  }

  if (isEdit && isLoadingContact) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? t('contacts.editContact') : t('contacts.newContact')}
        description={isEdit ? contact?.name : ''}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard'  },
          { label: t('nav.contacts'),  path: '/contacts'   },
          ...(isEdit && contact ? [{ label: contact.name, path: `/contacts/${contact.id}` }] : []),
          { label: isEdit ? t('contacts.editContact') : t('contacts.newContact') },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate(isEdit && contact ? `/contacts/${contact.id}` : '/contacts')}
          >
            {t('contacts.backToList')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ---- ASOSIY FORMA ---- */}
          <div className="lg:col-span-2 space-y-4">

            <Card padding="md">
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                {t('contacts.infoSection')}
              </h3>

              {/* Kontakt turi */}
              <div className="space-y-1.5 mb-4">
                <label className="text-sm font-medium text-text-secondary">
                  Kontakt turi <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONTACT_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setValue('type', ct.value, { shouldValidate: true })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                        selectedType === ct.value
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-border-primary bg-bg-tertiary text-text-secondary hover:border-border-secondary',
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', ct.dot)} />
                      {TYPE_LABELS[ct.value]}
                    </button>
                  ))}
                </div>
                {errors.type && (
                  <p className="text-xs text-danger">{errors.type.message}</p>
                )}
              </div>

              {/* Ism va Yuridik nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Input
                  label={t('contacts.stir')}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
              <div className="mb-4">
                <Input
                  label={t('common.email')}
                  type="email"
                  placeholder="email@example.uz"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              {/* Manzil */}
              <Input
                label={t('contacts.address')}
                placeholder="Toshkent sh., Yunusobod t., 5-ko'cha, 12-uy"
                {...register('address')}
              />
            </Card>

            {/* Izoh */}
            <Card padding="md">
              <Textarea
                label={t('contacts.note')}
                placeholder="Qo'shimcha ma'lumotlar..."
                rows={4}
                {...register('notes')}
              />
            </Card>
          </div>

          {/* ---- O'NG: Moliyaviy shartlar ---- */}
          <div className="space-y-4">
            <Card padding="md">
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                {t('contacts.financialSection')}
              </h3>
              <div className="space-y-4">
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
            </Card>

            {/* Tugmalar */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                loading={isBusy}
                leftIcon={<Save size={15} />}
                onClick={handleSubmit(onSubmit)}
                className="w-full"
              >
                {isEdit ? t('common.save') : t('contacts.createContact')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={isBusy}
                onClick={() => navigate(isEdit && contact ? `/contacts/${contact.id}` : '/contacts')}
                className="w-full"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
