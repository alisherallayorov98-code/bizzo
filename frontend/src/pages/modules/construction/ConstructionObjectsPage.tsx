import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, HardHat, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle,
  MapPin, Users, DollarSign, Calendar, Pause, Edit2, Trash2,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button }     from '@components/ui/Button/Button'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { KPICard }    from '@components/charts/KPICard/KPICard'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { Modal }      from '@components/ui/Modal/Modal'
import { Input }      from '@components/ui/Input/Input'
import {
  useProjects, useConstructionStats, useCreateProject,
  useUpdateProject, useDeleteProject,
} from '@features/construction/hooks/useConstruction'
import { useContacts } from '@features/contacts/hooks/useContacts'
import type { ConstructionProject } from '@services/construction.service'
import { formatCurrency, formatDate } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

const STATUS_ICON_MAP = {
  PLANNING:    Clock,
  IN_PROGRESS: TrendingUp,
  ON_HOLD:     Pause,
  COMPLETED:   CheckCircle,
  CANCELLED:   TrendingDown,
}

const STATUS_VARIANT_MAP = {
  PLANNING:    'default'  as const,
  IN_PROGRESS: 'primary'  as const,
  ON_HOLD:     'warning'  as const,
  COMPLETED:   'success'  as const,
  CANCELLED:   'danger'   as const,
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({
    name: '', address: '', clientId: '', contractAmount: '',
    startDate: '', endDate: '', description: '',
  })
  const createProject = useCreateProject()
  const { data: contacts } = useContacts({ limit: 200 })

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await createProject.mutateAsync({
      name:           form.name,
      address:        form.address || undefined,
      clientId:       form.clientId || undefined,
      contractAmount: parseFloat(form.contractAmount) || 0,
      startDate:      form.startDate || undefined,
      endDate:        form.endDate   || undefined,
      description:    form.description || undefined,
    })
    onClose()
    setForm({ name: '', address: '', clientId: '', contractAmount: '', startDate: '', endDate: '', description: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.newProjectTitle')} size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={createProject.isPending} onClick={handleSubmit} disabled={!form.name}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('construction.projectNameLabel')} placeholder={t('construction.projectNamePh')} value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input label={t('construction.addressLabel')} placeholder={t('construction.addressPh')} value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('construction.clientLabel')}</label>
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/50">
              <option value="">{t('construction.clientOptional')}</option>
              {contacts?.data?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label={t('construction.contractAmountLabel')} type="number" placeholder="0" value={form.contractAmount}
            onChange={e => setForm(f => ({ ...f, contractAmount: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('common.startDate')} type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label={t('common.endDate')} type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
    </Modal>
  )
}

function EditProjectModal({ project, open, onClose }: {
  project: ConstructionProject | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const [form, setForm] = useState({
    name: '', address: '', clientId: '', contractAmount: '',
    startDate: '', endDate: '', description: '',
  })
  const updateProject = useUpdateProject()
  const { data: contacts } = useContacts({ limit: 200 })

  useEffect(() => {
    if (!project) return
    setForm({
      name:           project.name,
      address:        project.address || '',
      clientId:       project.clientId || '',
      contractAmount: String(project.contractAmount || ''),
      startDate:      project.startDate ? project.startDate.slice(0, 10) : '',
      endDate:        project.endDate   ? project.endDate.slice(0, 10)   : '',
      description:    project.description || '',
    })
  }, [project?.id])

  if (!project) return null

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    await updateProject.mutateAsync({
      id:             project.id,
      name:           form.name,
      address:        form.address        || undefined,
      clientId:       form.clientId       || undefined,
      contractAmount: parseFloat(form.contractAmount) || 0,
      startDate:      form.startDate      || undefined,
      endDate:        form.endDate        || undefined,
      description:    form.description    || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.editProjectTitle')} size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={updateProject.isPending} onClick={handleSubmit} disabled={!form.name}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('construction.projectNameLabel')} value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Input label={t('construction.addressLabel')} value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('construction.clientLabel')}</label>
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/50">
              <option value="">{t('construction.clientOptional')}</option>
              {contacts?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label={t('construction.contractAmountLabel')} type="number" value={form.contractAmount}
            onChange={e => setForm(f => ({ ...f, contractAmount: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('common.startDate')} type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          <Input label={t('common.endDate')} type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
    </Modal>
  )
}

function DeleteProjectModal({ project, open, onClose }: {
  project: ConstructionProject | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const deleteProject = useDeleteProject()

  if (!project) return null

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id)
    onClose()
    navigate('/construction/objects')
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.deleteProjectTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" size="sm" loading={deleteProject.isPending} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 p-3 bg-danger/5 rounded-lg border border-danger/20">
        <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
        <p className="text-sm text-text-primary">
          <span className="font-semibold">"{project.name}"</span>{' '}
          {t('construction.deleteProjectConfirm')}
        </p>
      </div>
    </Modal>
  )
}

function ProjectCard({ project, onEdit, onDelete }: {
  project: ConstructionProject
  onEdit:   (p: ConstructionProject) => void
  onDelete: (p: ConstructionProject) => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const StatusIcon = STATUS_ICON_MAP[project.status as keyof typeof STATUS_ICON_MAP] || Clock
  const variant = STATUS_VARIANT_MAP[project.status as keyof typeof STATUS_VARIANT_MAP] || 'default'
  const statusLabel = t(`construction.status${project.status.charAt(0) + project.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}` as any)
    || project.status

  return (
    <Card hoverable onClick={() => navigate(`/construction/objects/${project.id}`)}
      className={cn('transition-all',
        project.isOverBudget && 'border-danger/30',
        project.isLate && !project.isOverBudget && 'border-warning/30')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{project.projectNumber}</span>
            <Badge variant={variant} size="sm">
              <StatusIcon size={10} className="mr-1" />
              {statusLabel}
            </Badge>
            {project.isOverBudget && (
              <Badge variant="danger" size="sm">
                <AlertTriangle size={10} className="mr-1" />
                {t('construction.overBudget')}
              </Badge>
            )}
          </div>
          <h3 className="font-display font-semibold text-text-primary truncate">{project.name}</h3>
        </div>
        <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(project)}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-subtle transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(project)}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {project.client && (
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-text-muted shrink-0" />
            <span className="text-xs text-text-secondary truncate">{project.client.name}</span>
          </div>
        )}
        {project.address && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-text-muted shrink-0" />
            <span className="text-xs text-text-secondary truncate">{project.address}</span>
          </div>
        )}
        {project.endDate && (
          <div className={cn('flex items-center gap-1.5', project.isLate ? 'text-danger' : 'text-text-muted')}>
            <Calendar size={12} className="shrink-0" />
            <span className="text-xs">
              {project.isLate
                ? t('construction.daysDelayed', { days: Math.abs(project.daysLeft || 0) })
                : project.daysLeft !== null
                ? t('construction.daysLeft', { days: project.daysLeft ?? 0 })
                : formatDate(project.endDate, 'short')}
            </span>
          </div>
        )}
      </div>

      {project.status === 'IN_PROGRESS' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">{t('construction.progressLabel')}</span>
            <span className="text-[10px] font-medium text-text-primary">{project.progress || 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div className={cn('h-full rounded-full transition-all',
              (project.progress || 0) >= 75 ? 'bg-success'
              : (project.progress || 0) >= 40 ? 'bg-accent-primary'
              : 'bg-warning')}
              style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-primary">
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">{t('construction.contractLabel')}</p>
          <p className="text-xs font-semibold tabular-nums text-text-primary">
            {formatCurrency(project.contractAmount || 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">{t('construction.expenseLabel')}</p>
          <p className={cn('text-xs font-semibold tabular-nums',
            project.isOverBudget ? 'text-danger' : 'text-text-primary')}>
            {formatCurrency(project.expenseTotal || 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted mb-0.5">{t('construction.profitLabel')}</p>
          <p className={cn('text-xs font-semibold tabular-nums',
            (project.profit || 0) >= 0 ? 'text-success' : 'text-danger')}>
            {formatCurrency(Math.abs(project.profit || 0))}
          </p>
        </div>
      </div>
    </Card>
  )
}

export default function ConstructionObjectsPage() {
  const t = useT()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [newModal,    setNewModal]    = useState(false)
  const [editProject, setEditProject] = useState<ConstructionProject | null>(null)
  const [delProject,  setDelProject]  = useState<ConstructionProject | null>(null)

  const { data, isLoading } = useProjects({ status: statusFilter !== 'ALL' ? statusFilter : undefined })
  const { data: stats } = useConstructionStats()

  const STATUS_TABS = [
    { id: 'ALL',         label: t('common.all') },
    { id: 'PLANNING',    label: t('construction.statusPlanning') },
    { id: 'IN_PROGRESS', label: t('construction.statusInProgress') },
    { id: 'COMPLETED',   label: t('construction.statusCompleted') },
    { id: 'ON_HOLD',     label: t('construction.statusOnHold') },
  ]

  return (
    <div>
      <PageHeader
        title={t('construction.objectsTitle')}
        description={t('construction.objectsDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('construction.moduleName') },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewModal(true)}>
            {t('construction.newProject')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title={t('construction.totalProjects')} value={stats?.total ?? '-'}
          icon={<HardHat size={18} />} iconColor="text-accent-primary" iconBg="bg-accent-subtle" loading={!stats} />
        <KPICard title={t('construction.activeProjects')} value={stats?.active ?? '-'}
          icon={<TrendingUp size={18} />} iconColor="text-success" iconBg="bg-success/10" loading={!stats} />
        <KPICard title={t('construction.totalContract')} value={stats ? formatCurrency(stats.totalContractAmount) : '-'}
          icon={<DollarSign size={18} />} iconColor="text-warning" iconBg="bg-warning/10" loading={!stats} />
        <KPICard title={t('construction.estimatedProfit')} value={stats ? formatCurrency(stats.estimatedProfit) : '-'}
          icon={<TrendingUp size={18} />}
          iconColor={(stats?.estimatedProfit ?? 0) >= 0 ? 'text-success' : 'text-danger'}
          iconBg={(stats?.estimatedProfit ?? 0) >= 0 ? 'bg-success/10' : 'bg-danger/10'}
          loading={!stats} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              statusFilter === tab.id
                ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-bg-tertiary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState icon={<HardHat size={32} />} title={t('construction.projectsNotFound')}
          description={t('construction.projectsNotFoundDesc')}
          action={{ label: t('construction.createProject'), onClick: () => setNewModal(true) }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.data.map((p: ConstructionProject) => (
            <ProjectCard key={p.id} project={p}
              onEdit={setEditProject} onDelete={setDelProject} />
          ))}
        </div>
      )}

      <NewProjectModal    open={newModal}        onClose={() => setNewModal(false)} />
      <EditProjectModal   project={editProject}  open={!!editProject}  onClose={() => setEditProject(null)} />
      <DeleteProjectModal project={delProject}   open={!!delProject}   onClose={() => setDelProject(null)} />
    </div>
  )
}
