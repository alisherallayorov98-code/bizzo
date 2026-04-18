import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@components/ui/Modal/Modal'
import { Button } from '@components/ui/Button/Button'
import { Input, Textarea } from '@components/ui/Input/Input'
import { cn } from '@utils/cn'
import type { Employee } from '@services/employee.service'
import { employeeService } from '@services/employee.service'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees'
import { useT } from '@i18n/index'

// ============================================
// VALIDATSIYA
// ============================================
const schema = z.object({
  firstName:    z.string().min(2, 'Ism kamida 2 ta belgi').max(100),
  lastName:     z.string().min(2, 'Familiya kamida 2 ta belgi').max(100),
  phone:        z.string().max(20).optional().or(z.literal('')),
  position:     z.string().max(100).optional().or(z.literal('')),
  department:   z.string().max(100).optional().or(z.literal('')),
  employeeType: z.enum(['PERMANENT', 'DAILY', 'CONTRACT']),
  baseSalary:   z.coerce.number().min(0),
  dailyRate:    z.coerce.number().min(0),
  hireDate:     z.string().optional().or(z.literal('')),
  notes:        z.string().max(500).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

// ============================================
// XODIM TURLARI
// ============================================
const EMPLOYEE_TYPES = [
  {
    value:       'PERMANENT' as const,
    labelKey:    'employees.permanent',
    descKey:     'employees.permanentDesc',
    emoji:       '👔',
  },
  {
    value:       'DAILY' as const,
    labelKey:    'employees.daily',
    descKey:     'employees.dailyDesc',
    emoji:       '🔨',
  },
  {
    value:       'CONTRACT' as const,
    labelKey:    'employees.contract',
    descKey:     'employees.contractDesc',
    emoji:       '📋',
  },
]

// ============================================
// PROPS
// ============================================
interface EmployeeFormModalProps {
  open:      boolean
  onClose:   () => void
  employee?: Employee | null
}

// ============================================
// MODAL
// ============================================
export function EmployeeFormModal({ open, onClose, employee }: EmployeeFormModalProps) {
  const t = useT()
  const isEdit = !!employee
  const create = useCreateEmployee()
  const update = useUpdateEmployee()

  const { data: departments = [] } = useQuery({
    queryKey: ['employees', 'departments'],
    queryFn:  employeeService.getDepartments,
    staleTime: 120_000,
  })

  const {
    register, handleSubmit, reset, watch,
    setValue, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeType: 'PERMANENT',
      baseSalary:   0,
      dailyRate:    0,
    },
  })

  useEffect(() => {
    if (open) {
      if (employee) {
        reset({
          firstName:    employee.firstName,
          lastName:     employee.lastName,
          phone:        employee.phone       ?? '',
          position:     employee.position    ?? '',
          department:   employee.department  ?? '',
          employeeType: employee.employeeType,
          baseSalary:   employee.baseSalary  ?? 0,
          dailyRate:    employee.dailyRate   ?? 0,
          hireDate:     employee.hireDate    ? employee.hireDate.slice(0, 10) : '',
          notes:        employee.notes       ?? '',
        })
      } else {
        reset({ employeeType: 'PERMANENT', baseSalary: 0, dailyRate: 0 })
      }
    }
  }, [open, employee, reset])

  const employeeType = watch('employeeType')
  const isBusy       = isSubmitting || create.isPending || update.isPending

  const onSubmit = async (data: FormData) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as any

    if (isEdit) {
      await update.mutateAsync({ id: employee!.id, data: cleaned })
    } else {
      await create.mutateAsync(cleaned)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('employees.editEmployee') : t('employees.newEmployee')}
      description={isEdit ? `${employee?.firstName} ${employee?.lastName}` : "Xodim ma'lumotlarini kiriting"}
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
            {isEdit ? t('common.save') : t('common.add')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" noValidate>

        {/* Xodim turi */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('employees.employeeType')}</label>
          <div className="grid grid-cols-3 gap-2">
            {EMPLOYEE_TYPES.map(et => (
              <button
                key={et.value}
                type="button"
                onClick={() => setValue('employeeType', et.value, { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all',
                  employeeType === et.value
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-primary bg-bg-tertiary hover:border-border-secondary',
                )}
              >
                <span className="text-xl">{et.emoji}</span>
                <span className={cn(
                  'text-xs font-medium',
                  employeeType === et.value ? 'text-accent-primary' : 'text-text-secondary',
                )}>
                  {t(et.labelKey)}
                </span>
                <span className="text-[10px] text-text-muted">{t(et.descKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ism va Familiya */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('employees.firstName')}
            placeholder="Alisher"
            required
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label={t('employees.lastName')}
            placeholder="Toshmatov"
            required
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        {/* Telefon va Lavozim */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('common.phone')}
            type="tel"
            placeholder="+998 90 123 45 67"
            {...register('phone')}
          />
          <Input
            label={t('employees.position')}
            placeholder="Omborchi, Buxgalter..."
            {...register('position')}
          />
        </div>

        {/* Bo'lim va Yollangan sana */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {t('employees.department')}
            </label>
            <input
              list="departments-list"
              placeholder="Bo'lim tanlang yoki kiriting"
              className="w-full h-9 px-3 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary transition-colors"
              {...register('department')}
            />
            <datalist id="departments-list">
              {departments.map((dep: string) => (
                <option key={dep} value={dep} />
              ))}
            </datalist>
          </div>
          <Input
            label={t('employees.hiredDate')}
            type="date"
            {...register('hireDate')}
          />
        </div>

        {/* Maosh — tur bo'yicha */}
        <div className="p-3 rounded-xl border border-border-primary bg-bg-tertiary">
          {employeeType === 'PERMANENT' || employeeType === 'CONTRACT' ? (
            <Input
              label={t('employees.monthlySalary')}
              type="number"
              placeholder="3 000 000"
              error={errors.baseSalary?.message}
              {...register('baseSalary')}
            />
          ) : (
            <Input
              label={t('employees.dailyRate')}
              type="number"
              placeholder="150 000"
              hint="8 soatlik ish kuni uchun"
              error={errors.dailyRate?.message}
              {...register('dailyRate')}
            />
          )}
        </div>

        {/* Izoh */}
        <Textarea
          label={t('employees.note')}
          placeholder="Qo'shimcha ma'lumot..."
          rows={2}
          {...register('notes')}
        />
      </form>
    </Modal>
  )
}
