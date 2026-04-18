import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, FileDown, ExternalLink,
  Edit2, Calendar, DollarSign, FileText, Clock,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Badge }      from '@components/ui/Badge/Badge'
import { Modal }      from '@components/ui/Modal/Modal'
import { Input }      from '@components/ui/Input/Input'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import {
  useContract, useSignContract, useCancelContract,
  useGeneratePdf, useUpdateContract,
} from '@features/contracts/hooks/useContracts'
import { formatCurrency, formatDate } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

const STATUS_CFG = {
  DRAFT:     { labelKey: 'contracts.draft',     variant: 'default'  as const, color: 'text-text-muted'    },
  ACTIVE:    { labelKey: 'contracts.active',    variant: 'success'  as const, color: 'text-success'       },
  COMPLETED: { labelKey: 'contracts.completed', variant: 'primary'  as const, color: 'text-accent-primary'},
  CANCELED:  { labelKey: 'contracts.canceled',  variant: 'danger'   as const, color: 'text-danger'        },
}

const TYPE_CFG: Record<string, { labelKey: string; variant: 'primary'|'info'|'warning'|'default' }> = {
  SALE:     { labelKey: 'contracts.typeSale',     variant: 'primary' },
  PURCHASE: { labelKey: 'contracts.typePurchase', variant: 'info'    },
  SERVICE:  { labelKey: 'contracts.typeService',  variant: 'warning' },
  RENT:     { labelKey: 'contracts.typeRent',     variant: 'default' },
  OTHER:    { labelKey: 'contracts.typeOther',    variant: 'default' },
}

function EditContractModal({ contractId, open, onClose }: {
  contractId: string; open: boolean; onClose: () => void
}) {
  const t = useT()
  const { data: contract } = useContract(contractId)
  const updateContract = useUpdateContract()
  const [form, setForm] = useState({
    title: '', startDate: '', endDate: '', totalAmount: '', notes: '',
  })

  // Sync form when contract loads
  const [synced, setSynced] = useState(false)
  if (contract && !synced) {
    setForm({
      title:       contract.title,
      startDate:   contract.startDate?.slice(0, 10) || '',
      endDate:     contract.endDate?.slice(0, 10)   || '',
      totalAmount: String(contract.totalAmount || ''),
      notes:       contract.notes || '',
    })
    setSynced(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    await updateContract.mutateAsync({
      id:          contractId,
      title:       form.title,
      startDate:   form.startDate   || undefined,
      endDate:     form.endDate     || undefined,
      totalAmount: parseFloat(form.totalAmount) || undefined,
      notes:       form.notes       || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setSynced(false) }}
      title={t('contracts.editContractTitle')} size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={updateContract.isPending} onClick={handleSubmit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('contracts.colTitle')} value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('contracts.startDate')} type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label={t('contracts.endDate')} type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <Input label={t('common.amount')} type="number" value={form.totalAmount}
          onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} />
        <Input label={t('common.notes')} value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  )
}

export default function ContractDetailPage() {
  const t        = useT()
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const [editModal,   setEditModal]   = useState(false)
  const [cancelModal, setCancelModal] = useState(false)

  const { data: contract, isLoading } = useContract(id!)
  const signContract   = useSignContract()
  const cancelContract = useCancelContract()
  const generatePdf    = useGeneratePdf()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={100} className="rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} height={80} className="rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!contract) return null

  const stCfg  = STATUS_CFG[contract.status as keyof typeof STATUS_CFG] || STATUS_CFG.DRAFT
  const typCfg = TYPE_CFG[contract.type] || TYPE_CFG.OTHER

  const handleGenerate = async () => {
    const result = await generatePdf.mutateAsync(id!)
    if (result.url) window.open(result.url, '_blank')
  }

  return (
    <div>
      <PageHeader
        title={contract.title}
        description={contract.contractNumber}
        breadcrumbs={[
          { label: t('nav.dashboard'),    path: '/dashboard' },
          { label: t('contracts.title'), path: '/contracts' },
          { label: contract.contractNumber },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {contract.status !== 'CANCELED' && contract.status !== 'COMPLETED' && (
              <Button variant="secondary" size="sm" leftIcon={<Edit2 size={14} />}
                onClick={() => setEditModal(true)}>
                {t('common.edit')}
              </Button>
            )}
            {contract.pdfUrl ? (
              <Button variant="secondary" size="sm" leftIcon={<ExternalLink size={14} />}
                onClick={() => window.open(contract.pdfUrl!, '_blank')}>
                {t('contracts.openPdf')}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" leftIcon={<FileDown size={14} />}
                loading={generatePdf.isPending} onClick={handleGenerate}>
                {t('contracts.generatePdf')}
              </Button>
            )}
            {contract.status === 'DRAFT' && (
              <Button variant="success" size="sm" leftIcon={<CheckCircle2 size={14} />}
                loading={signContract.isPending} onClick={() => signContract.mutate(id!)}>
                {t('contracts.sign')}
              </Button>
            )}
            {contract.status !== 'CANCELED' && contract.status !== 'COMPLETED' && (
              <Button variant="danger" size="sm" leftIcon={<XCircle size={14} />}
                onClick={() => setCancelModal(true)}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        }
      />

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-text-muted" />
            <p className="text-xs text-text-muted">{t('contracts.colStatus')}</p>
          </div>
          <Badge variant={stCfg.variant} size="md">{t(stCfg.labelKey as any)}</Badge>
        </div>
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-text-muted" />
            <p className="text-xs text-text-muted">{t('common.amount')}</p>
          </div>
          <p className="text-lg font-bold tabular-nums text-text-primary">
            {contract.totalAmount ? formatCurrency(contract.totalAmount) : '—'}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-text-muted" />
            <p className="text-xs text-text-muted">{t('contracts.startDate')}</p>
          </div>
          <p className="text-sm font-semibold text-text-primary">
            {contract.startDate ? formatDate(contract.startDate, 'short') : '—'}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-text-muted" />
            <p className="text-xs text-text-muted">{t('contracts.endDate')}</p>
          </div>
          <p className={cn('text-sm font-semibold',
            contract.endDate && new Date(contract.endDate) < new Date() && contract.status === 'ACTIVE'
              ? 'text-danger' : 'text-text-primary')}>
            {contract.endDate ? formatDate(contract.endDate, 'short') : '—'}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-semibold text-text-primary mb-4">{t('contracts.contractInfo')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-border-primary/50">
              <span className="text-text-muted">{t('contracts.colNumber')}</span>
              <span className="font-mono font-semibold text-accent-primary">{contract.contractNumber}</span>
            </div>
            {(contract as any).contact && (
              <div className="flex justify-between text-sm py-2 border-b border-border-primary/50">
                <span className="text-text-muted">{t('common.contact')}</span>
                <div className="text-right">
                  <p className="font-medium text-text-primary">{(contract as any).contact.name}</p>
                  {(contract as any).contact.phone && (
                    <p className="text-xs text-text-muted">{(contract as any).contact.phone}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm py-2 border-b border-border-primary/50">
              <span className="text-text-muted">{t('contracts.colTitle')}</span>
              <span className="font-medium text-text-primary">{contract.title}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary/50">
              <span className="text-text-muted">{t('contracts.colType')}</span>
              <Badge variant={typCfg.variant} size="sm">{t(typCfg.labelKey as any)}</Badge>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary/50">
              <span className="text-text-muted">{t('common.currency')}</span>
              <span className="text-text-primary">{contract.currency}</span>
            </div>
            {contract.notes && (
              <div className="pt-2">
                <p className="text-xs text-text-muted mb-1">{t('common.notes')}</p>
                <p className="text-sm text-text-secondary bg-bg-tertiary rounded-lg p-3">{contract.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-display font-semibold text-text-primary text-sm mb-3">{t('contracts.timeline')}</h3>
            <div className="space-y-2 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span className="text-text-muted">{t('common.created')}</span>
                <span>{formatDate(contract.createdAt, 'short')}</span>
              </div>
              {contract.startDate && (
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('contracts.startDate')}</span>
                  <span>{formatDate(contract.startDate, 'short')}</span>
                </div>
              )}
              {contract.endDate && (
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('contracts.endDate')}</span>
                  <span className={cn(
                    new Date(contract.endDate) < new Date() && contract.status === 'ACTIVE' && 'text-danger font-medium'
                  )}>{formatDate(contract.endDate, 'short')}</span>
                </div>
              )}
            </div>
          </Card>

          {contract.pdfUrl && (
            <Card className="bg-success/5 border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <FileDown size={16} className="text-success" />
                <span className="text-sm font-semibold text-success">{t('contracts.pdfReady')}</span>
              </div>
              <Button variant="success" size="sm" fullWidth leftIcon={<ExternalLink size={13} />}
                onClick={() => window.open(contract.pdfUrl!, '_blank')}>
                {t('contracts.openPdf')}
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditContractModal contractId={id!} open={editModal} onClose={() => setEditModal(false)} />

      {/* Cancel confirmation */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)}
        title={t('contracts.cancelTitle')} size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCancelModal(false)}>{t('common.back')}</Button>
            <Button variant="danger" size="sm" loading={cancelContract.isPending}
              onClick={async () => { await cancelContract.mutateAsync(id!); setCancelModal(false) }}>
              {t('contracts.confirmCancel')}
            </Button>
          </>
        }>
        <p className="text-sm text-text-secondary">{t('contracts.cancelConfirmText')}</p>
      </Modal>
    </div>
  )
}
