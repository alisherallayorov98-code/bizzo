import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Input }      from '@components/ui/Input/Input'
import { useCreateContract, useContractTemplates } from '@features/contracts/hooks/useContracts'
import { useContacts } from '@features/contacts/hooks/useContacts'
import { formatCurrency } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

const CONTRACT_TYPES = [
  { value: 'SALE',     labelKey: 'contracts.typeSale',     color: 'border-accent-primary text-accent-primary bg-accent-subtle' },
  { value: 'PURCHASE', labelKey: 'contracts.typePurchase', color: 'border-info text-info bg-info/10' },
  { value: 'SERVICE',  labelKey: 'contracts.typeService',  color: 'border-warning text-warning bg-warning/10' },
  { value: 'RENT',     labelKey: 'contracts.typeRent',     color: 'border-success text-success bg-success/10' },
  { value: 'OTHER',    labelKey: 'contracts.typeOther',    color: 'border-border-secondary text-text-secondary bg-bg-tertiary' },
]

export default function ContractFormPage() {
  const t        = useT()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    contactId: '', title: '', type: 'SALE',
    templateId: '', startDate: '', endDate: '',
    totalAmount: '', currency: 'UZS', notes: '',
  })
  const [touched, setTouch] = useState({ contactId: false, title: false })

  const createContract = useCreateContract()
  const { data: contacts }  = useContacts({ limit: 300 })
  const { data: templates } = useContractTemplates()

  const totalPreview = parseFloat(form.totalAmount) || 0
  const errors = {
    contactId: touched.contactId && !form.contactId ? t('validation.required') : '',
    title:     touched.title     && !form.title.trim() ? t('validation.required') : '',
  }

  const handleSubmit = async () => {
    setTouch({ contactId: true, title: true })
    if (!form.contactId || !form.title) return
    const result = await createContract.mutateAsync({
      contactId:   form.contactId,
      title:       form.title,
      type:        form.type as any,
      templateId:  form.templateId || undefined,
      startDate:   form.startDate   || undefined,
      endDate:     form.endDate     || undefined,
      totalAmount: parseFloat(form.totalAmount) || undefined,
      currency:    form.currency,
      notes:       form.notes || undefined,
    })
    navigate(`/contracts/${result.id}`)
  }

  const filteredTemplates = templates?.filter(
    tpl => tpl.isActive && (!form.type || tpl.type === form.type)
  ) || []

  return (
    <div>
      <PageHeader
        title={t('contracts.newContract')}
        description={t('contracts.newContractDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'),    path: '/dashboard' },
          { label: t('contracts.title'), path: '/contracts' },
          { label: t('contracts.newContract') },
        ]}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate('/contracts')}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Type selector */}
        <Card>
          <h3 className="font-display font-semibold text-text-primary mb-3">{t('contracts.selectType')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CONTRACT_TYPES.map(ct => (
              <button key={ct.value} type="button" onClick={() => setForm(f => ({ ...f, type: ct.value, templateId: '' }))}
                className={cn('py-2.5 rounded-xl text-xs font-semibold border text-center transition-all',
                  form.type === ct.value ? ct.color : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
                {t(ct.labelKey as any)}
              </button>
            ))}
          </div>
        </Card>

        {/* Template picker */}
        {filteredTemplates.length > 0 && (
          <Card>
            <h3 className="font-display font-semibold text-text-primary mb-3">{t('contracts.selectTemplate')}</h3>
            <div className="space-y-2">
              <label className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                !form.templateId ? 'border-accent-primary bg-accent-subtle' : 'border-border-primary hover:border-border-secondary')}>
                <input type="radio" name="template" value=""
                  checked={!form.templateId} onChange={() => setForm(f => ({ ...f, templateId: '' }))}
                  className="accent-accent-primary" />
                <span className="text-sm text-text-secondary">{t('contracts.noTemplate')}</span>
              </label>
              {filteredTemplates.map(tpl => (
                <label key={tpl.id} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  form.templateId === tpl.id ? 'border-accent-primary bg-accent-subtle' : 'border-border-primary hover:border-border-secondary')}>
                  <input type="radio" name="template" value={tpl.id}
                    checked={form.templateId === tpl.id} onChange={() => setForm(f => ({ ...f, templateId: tpl.id }))}
                    className="accent-accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{tpl.name}</p>
                    {tpl.isDefault && (
                      <p className="text-[10px] text-accent-primary">{t('contracts.defaultTemplate')}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Main form */}
        <Card>
          <h3 className="font-display font-semibold text-text-primary mb-4">{t('contracts.contractDetails')}</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">{t('common.contact')} *</label>
              <select value={form.contactId}
                onBlur={() => setTouch(p => ({ ...p, contactId: true }))}
                onChange={e => { setForm(f => ({ ...f, contactId: e.target.value })); setTouch(p => ({ ...p, contactId: true })) }}
                className={cn('h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
                  errors.contactId ? 'border-danger' : 'border-border-primary')}>
                <option value="">{t('contracts.selectContact')}</option>
                {contacts?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.contactId && <p className="text-xs text-danger">{errors.contactId}</p>}
            </div>

            <Input label={`${t('contracts.colTitle')} *`} placeholder={t('contracts.titlePh')}
              value={form.title}
              onBlur={() => setTouch(p => ({ ...p, title: true }))}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setTouch(p => ({ ...p, title: true })) }}
              error={errors.title} />

            <div className="grid grid-cols-2 gap-3">
              <Input label={t('contracts.startDate')} type="date" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              <Input label={t('contracts.endDate')} type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label={t('common.amount')} type="number" placeholder="0" value={form.totalAmount}
                  onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">{t('common.currency')}</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none">
                  {['UZS', 'USD', 'EUR', 'RUB'].map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input label={t('common.notes')} placeholder={t('common.notesOptional')}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </Card>

        {/* Summary */}
        {(form.contactId || form.title || totalPreview > 0) && (
          <Card className="bg-accent-subtle border-accent-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-accent-primary" />
              <h3 className="text-sm font-semibold text-accent-primary">{t('contracts.summary')}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              {form.title && (
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('contracts.colTitle')}</span>
                  <span className="font-medium text-text-primary">{form.title}</span>
                </div>
              )}
              {totalPreview > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('common.amount')}</span>
                  <span className="font-semibold text-success">{formatCurrency(totalPreview)}</span>
                </div>
              )}
              {form.endDate && (
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('contracts.endDate')}</span>
                  <span className="text-text-primary">{form.endDate}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/contracts')}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={createContract.isPending}
            disabled={!form.contactId || !form.title} onClick={handleSubmit}>
            {t('contracts.createBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
