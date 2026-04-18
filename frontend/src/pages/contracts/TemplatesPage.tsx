import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, FileText, ArrowLeft, Star, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Badge }      from '@components/ui/Badge/Badge'
import { Modal }      from '@components/ui/Modal/Modal'
import { Input }      from '@components/ui/Input/Input'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import {
  useContractTemplates, useCreateTemplate, useDeleteTemplate,
} from '@features/contracts/hooks/useContracts'
import type { ContractTemplateDto } from '@services/contracts.service'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

const TYPE_CFG: Record<string, { labelKey: string; variant: 'primary'|'info'|'warning'|'default' }> = {
  SALE:     { labelKey: 'contracts.typeSale',     variant: 'primary' },
  PURCHASE: { labelKey: 'contracts.typePurchase', variant: 'info'    },
  SERVICE:  { labelKey: 'contracts.typeService',  variant: 'warning' },
  RENT:     { labelKey: 'contracts.typeRent',     variant: 'default' },
  OTHER:    { labelKey: 'contracts.typeOther',    variant: 'default' },
}

function NewTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({
    name: '', type: 'SALE', content: '', isDefault: false,
  })
  const createTemplate = useCreateTemplate()

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await createTemplate.mutateAsync({
      name:      form.name,
      type:      form.type as any,
      content:   { body: form.content },
      isDefault: form.isDefault,
    })
    onClose()
    setForm({ name: '', type: 'SALE', content: '', isDefault: false })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('contracts.newTemplate')} size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={createTemplate.isPending}
            onClick={handleSubmit} disabled={!form.name}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('contracts.templateName')} *`} placeholder={t('contracts.templateNamePh')}
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('contracts.colType')}</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_CFG).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => setForm(f => ({ ...f, type: val }))}
                className={cn('py-2 rounded-lg text-xs font-medium border text-center transition-all',
                  form.type === val
                    ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                    : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
                {t(cfg.labelKey as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('contracts.templateContent')}</label>
          <textarea rows={8} value={form.content} placeholder={t('contracts.templateContentPh')}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-y font-mono" />
          <p className="text-[11px] text-text-muted">{t('contracts.templateHint')}</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isDefault}
            onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
            className="w-4 h-4 rounded accent-accent-primary" />
          <span className="text-sm text-text-secondary">{t('contracts.setAsDefault')}</span>
        </label>
      </div>
    </Modal>
  )
}

function TemplateCard({ tpl }: { tpl: ContractTemplateDto }) {
  const t = useT()
  const [confirmDel, setConfirmDel] = useState(false)
  const deleteTemplate = useDeleteTemplate()
  const typCfg = TYPE_CFG[tpl.type] || TYPE_CFG.OTHER

  return (
    <>
      <Card hoverable className={cn(!tpl.isActive && 'opacity-60')}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
              <FileText size={16} className="text-accent-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-text-primary">{tpl.name}</p>
                {tpl.isDefault && <Star size={11} className="text-warning fill-warning" />}
              </div>
              <Badge variant={typCfg.variant} size="sm">{t(typCfg.labelKey as any)}</Badge>
            </div>
          </div>
          <button onClick={() => setConfirmDel(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>

        {tpl.content?.body && (
          <p className="text-xs text-text-muted bg-bg-tertiary rounded-lg p-2.5 line-clamp-3 font-mono">
            {tpl.content.body}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary">
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            {tpl.isDefault && (
              <span className="flex items-center gap-1 text-warning">
                <Star size={10} className="fill-warning" /> {t('contracts.defaultTemplate')}
              </span>
            )}
            {tpl.isActive && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 size={10} /> {t('contracts.activeTemplate')}
              </span>
            )}
          </div>
          {tpl.fields?.length > 0 && (
            <span className="text-[10px] text-text-muted">
              {tpl.fields.length} {t('contracts.fieldsCount')}
            </span>
          )}
        </div>
      </Card>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)}
        title={t('contracts.deleteTemplateTitle')} size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDel(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" size="sm" loading={deleteTemplate.isPending}
              onClick={async () => { await deleteTemplate.mutateAsync(tpl.id); setConfirmDel(false) }}>
              {t('common.delete')}
            </Button>
          </>
        }>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold">"{tpl.name}"</span>{' '}
          {t('contracts.deleteTemplateConfirm')}
        </p>
      </Modal>
    </>
  )
}

export default function TemplatesPage() {
  const t        = useT()
  const navigate = useNavigate()
  const [newModal, setNewModal] = useState(false)

  const { data: templates, isLoading } = useContractTemplates()

  return (
    <div>
      <PageHeader
        title={t('contracts.templatesTitle')}
        description={t('contracts.templatesDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'),     path: '/dashboard' },
          { label: t('contracts.title'),  path: '/contracts' },
          { label: t('contracts.templates') },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate('/contracts')}>
              {t('common.back')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}
              onClick={() => setNewModal(true)}>
              {t('contracts.newTemplate')}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-bg-tertiary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !templates?.length ? (
        <EmptyState icon={<FileText size={32} />}
          title={t('contracts.noTemplates')}
          description={t('contracts.noTemplatesDesc')}
          action={{ label: t('contracts.newTemplate'), onClick: () => setNewModal(true) }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} />)}
        </div>
      )}

      <NewTemplateModal open={newModal} onClose={() => setNewModal(false)} />
    </div>
  )
}
