import { useState } from 'react'
import {
  Wrench, Plus, Search, AlertCircle,
  CheckCircle, Clock, XCircle, ChevronDown, Eye,
} from 'lucide-react'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Button }           from '@components/ui/Button/Button'
import { Badge }            from '@components/ui/Badge/Badge'
import { Input }            from '@components/ui/Input/Input'
import { Modal }            from '@components/ui/Modal/Modal'
import { KPICard }          from '@components/charts/KPICard/KPICard'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { EmptyState }       from '@components/ui/EmptyState/EmptyState'
import { useDebounce }      from '@hooks/useDebounce'
import {
  useServiceTickets, useServiceTicketStats,
  useCreateServiceTicket, useUpdateServiceTicket, useDeleteServiceTicket,
} from '@features/service/hooks/useServiceTickets'
import type { ServiceTicket, ServiceStatus, ServicePriority } from '@services/service-tickets.service'
import { useContacts }      from '@features/contacts/hooks/useContacts'
import { formatDate }       from '@utils/formatters'
import { cn }               from '@utils/cn'

// ============================================
// STATUS CONFIG
// ============================================
const STATUS_CONFIG: Record<ServiceStatus, {
  label:   string
  variant: 'default' | 'warning' | 'info' | 'success' | 'danger'
  icon:    typeof AlertCircle
}> = {
  OPEN:        { label: 'Ochiq',      variant: 'warning', icon: AlertCircle },
  IN_PROGRESS: { label: 'Jarayonda', variant: 'info',    icon: Clock       },
  WAITING:     { label: 'Kutmoqda',  variant: 'default', icon: Clock       },
  RESOLVED:    { label: 'Hal qilindi', variant: 'success', icon: CheckCircle },
  CLOSED:      { label: 'Yopildi',   variant: 'danger',  icon: XCircle     },
}

const PRIORITY_CONFIG: Record<ServicePriority, {
  label: string
  color: string
}> = {
  LOW:    { label: 'Past',     color: 'text-text-muted'  },
  MEDIUM: { label: "O'rta",   color: 'text-info'        },
  HIGH:   { label: 'Yuqori',  color: 'text-warning'     },
  URGENT: { label: 'Shoshilinch', color: 'text-danger'  },
}

// ============================================
// YANGI TIKET MODALI
// ============================================
function NewTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: contactsResult } = useContacts({ limit: 300 })
  const contacts = contactsResult?.data ?? []
  const create   = useCreateServiceTicket()

  const [form, setForm] = useState({
    title:       '',
    description: '',
    contactId:   '',
    priority:    'MEDIUM' as ServicePriority,
    dueDate:     '',
    notes:       '',
  })

  const reset = () => setForm({ title: '', description: '', contactId: '', priority: 'MEDIUM', dueDate: '', notes: '' })

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    await create.mutateAsync({
      title:       form.title,
      description: form.description || undefined,
      contactId:   form.contactId   || undefined,
      priority:    form.priority,
      dueDate:     form.dueDate     || undefined,
      notes:       form.notes       || undefined,
    })
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Yangi xizmat tiketi"
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); onClose() }}>Bekor</Button>
          <Button
            variant="primary"
            size="sm"
            loading={create.isPending}
            disabled={!form.title.trim()}
            onClick={handleSubmit}
          >
            Yaratish
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <Input
          label="Sarlavha *"
          placeholder="Muammo yoki so'rov..."
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Tavsif</label>
          <textarea
            rows={3}
            placeholder="Batafsil ma'lumot..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 py-2 focus:outline-none focus:border-accent-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Kontakt</label>
            <select
              value={form.contactId}
              onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}
              className="w-full h-9 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 focus:outline-none focus:border-accent-primary"
            >
              <option value="">Tanlang...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Muhimlik</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as ServicePriority }))}
              className="w-full h-9 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 focus:outline-none focus:border-accent-primary"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Muddat"
          type="date"
          value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
        />
      </div>
    </Modal>
  )
}

// ============================================
// TIKET TAFSILOT / TAHRIRLASH MODALI
// ============================================
function TicketDetailModal({ ticket, onClose }: { ticket: ServiceTicket; onClose: () => void }) {
  const update = useUpdateServiceTicket()

  const [title,       setTitle]       = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description ?? '')
  const [status,      setStatus]      = useState<ServiceStatus>(ticket.status)
  const [priority,    setPriority]    = useState<ServicePriority>(ticket.priority)
  const [isDirty,     setIsDirty]     = useState(false)

  const handleSave = async () => {
    await update.mutateAsync({ id: ticket.id, title, description, status, priority })
    onClose()
  }

  const mark = (field: string, val: any) => {
    setIsDirty(true)
    if (field === 'title')       setTitle(val)
    if (field === 'description') setDescription(val)
    if (field === 'status')      setStatus(val)
    if (field === 'priority')    setPriority(val)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Tiket — ${ticket.contact?.name ?? '—'}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Yopish</Button>
          {isDirty && (
            <Button variant="primary" size="sm" loading={update.isPending} onClick={handleSave}>
              Saqlash
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Sarlavha *</label>
          <input
            value={title}
            onChange={e => mark('title', e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 py-2 focus:outline-none focus:border-accent-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Tavsif</label>
          <textarea
            rows={4}
            value={description}
            onChange={e => mark('description', e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 py-2 focus:outline-none focus:border-accent-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Holat</label>
            <select
              value={status}
              onChange={e => mark('status', e.target.value)}
              className="w-full h-9 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 focus:outline-none focus:border-accent-primary"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Muhimlik</label>
            <select
              value={priority}
              onChange={e => mark('priority', e.target.value)}
              className="w-full h-9 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary px-3 focus:outline-none focus:border-accent-primary"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-text-muted pt-1 border-t border-border-primary">
          <div>
            <span className="font-medium">Yaratilgan:</span>{' '}
            {ticket.createdAt ? formatDate(ticket.createdAt) : '—'}
          </div>
          <div>
            <span className="font-medium">Muddat:</span>{' '}
            {ticket.dueDate ? formatDate(ticket.dueDate) : '—'}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ServiceTicketsPage() {
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<string>('')
  const [priorityFilter,  setPriorityFilter]  = useState<string>('')
  const [newOpen,         setNewOpen]         = useState(false)
  const [viewTicket,      setViewTicket]      = useState<ServiceTicket | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  const { data: stats } = useServiceTicketStats()
  const { data, isLoading } = useServiceTickets({
    search:   debouncedSearch   || undefined,
    status:   statusFilter      || undefined,
    priority: priorityFilter    || undefined,
  } as any)

  const updateTicket = useUpdateServiceTicket()
  const deleteTicket = useDeleteServiceTicket()

  const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '',            label: 'Barchasi'   },
    { value: 'OPEN',        label: 'Ochiq'      },
    { value: 'IN_PROGRESS', label: 'Jarayonda' },
    { value: 'WAITING',     label: 'Kutmoqda'  },
    { value: 'RESOLVED',    label: 'Hal qilindi' },
    { value: 'CLOSED',      label: 'Yopildi'   },
  ]

  return (
    <div>
      <PageHeader
        title="Xizmat tiketi"
        description="Mijozlar so'rovlari va muammolarini boshqarish"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Xizmat' },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setNewOpen(true)}>
            Yangi tiket
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Jami tiketlar"
          value={stats?.total ?? '—'}
          icon={<Wrench size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={!stats}
        />
        <KPICard
          title="Ochiq"
          value={stats?.open ?? '—'}
          icon={<AlertCircle size={18} />}
          iconColor={(stats?.open ?? 0) > 0 ? 'text-warning' : 'text-text-muted'}
          iconBg={(stats?.open ?? 0) > 0 ? 'bg-warning/10' : 'bg-bg-tertiary'}
          loading={!stats}
        />
        <KPICard
          title="Jarayonda"
          value={stats?.inProgress ?? '—'}
          icon={<Clock size={18} />}
          iconColor="text-info"
          iconBg="bg-info/10"
          loading={!stats}
        />
        <KPICard
          title="Hal qilindi"
          value={stats?.resolved ?? '—'}
          icon={<CheckCircle size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={!stats}
        />
      </div>

      {/* Jadval */}
      <Card padding="none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          <Input
            placeholder="Qidirish..."
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />

          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none h-8 pl-3 pr-8 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="appearance-none h-8 pl-3 pr-8 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">Barcha muhimlik</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Sarlavha', 'Kontakt', 'Muhimlik', 'Holat', 'Muddat', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Wrench size={28} />}
                      title="Tiketlar yo'q"
                      description="Yangi tiket yaratish uchun yuqoridagi tugmani bosing"
                    />
                  </td>
                </tr>
              ) : (
                data.data.map((ticket: ServiceTicket) => {
                  const statusCfg   = STATUS_CONFIG[ticket.status]
                  const priorityCfg = PRIORITY_CONFIG[ticket.priority]
                  const StatusIcon  = statusCfg.icon
                  const isOverdue   = ticket.dueDate
                    && new Date(ticket.dueDate) < new Date()
                    && !['RESOLVED', 'CLOSED'].includes(ticket.status)

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setViewTicket(ticket)}
                      className={cn(
                        'border-b border-border-primary transition-colors group cursor-pointer',
                        isOverdue ? 'bg-danger/[0.02] hover:bg-danger/5' : 'hover:bg-bg-tertiary/50',
                      )}
                    >
                      {/* Sarlavha */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {isOverdue && <AlertCircle size={13} className="text-danger shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-sm font-medium text-text-primary">{ticket.title}</p>
                            {ticket.description && (
                              <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{ticket.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kontakt */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {ticket.contact?.name ?? '—'}
                        </span>
                      </td>

                      {/* Muhimlik */}
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold', priorityCfg.color)}>
                          {priorityCfg.label}
                        </span>
                      </td>

                      {/* Holat */}
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg.variant} size="sm">
                          <StatusIcon size={10} className="mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </td>

                      {/* Muddat */}
                      <td className="px-4 py-3">
                        {ticket.dueDate ? (
                          <span className={cn(
                            'text-sm',
                            isOverdue ? 'text-danger font-medium' : 'text-text-secondary',
                          )}>
                            {formatDate(ticket.dueDate)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>

                      {/* Amallar */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="xs"
                            leftIcon={<Eye size={12} />}
                            onClick={() => setViewTicket(ticket)}
                          >
                            Ko'rish
                          </Button>
                          {ticket.status === 'OPEN' && (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => updateTicket.mutate({ id: ticket.id, status: 'IN_PROGRESS' })}
                            >
                              Boshlash
                            </Button>
                          )}
                          {ticket.status === 'IN_PROGRESS' && (
                            <Button
                              variant="success"
                              size="xs"
                              leftIcon={<CheckCircle size={12} />}
                              onClick={() => updateTicket.mutate({ id: ticket.id, status: 'RESOLVED' })}
                            >
                              Hal qilindi
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)} />
      {viewTicket && (
        <TicketDetailModal ticket={viewTicket} onClose={() => setViewTicket(null)} />
      )}
    </div>
  )
}
