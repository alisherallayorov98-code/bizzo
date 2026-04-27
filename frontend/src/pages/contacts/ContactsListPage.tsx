import { useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  Plus, Search, Download,
  Users, TrendingUp, TrendingDown, AlertCircle,
  Phone, MapPin, Eye, Edit2, Trash2,
} from 'lucide-react'
import { BulkActionBar } from '@components/ui/BulkActionBar/BulkActionBar'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { Pagination }       from '@components/ui/Pagination/Pagination'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { ConfirmDialog } from '@components/ui/Modal/Modal'
import { ContactFormModal } from '@features/contacts/components/ContactFormModal'
import {
  useContacts, useContactStats, useDeleteContact, useBulkDeleteContacts,
} from '@features/contacts/hooks/useContacts'
import { useT } from '@i18n/index'
import { contactService } from '@services/contact.service'
import type { Contact, ContactType } from '@services/contact.service'
import { formatCurrency, formatPhone, getInitials } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useDebounce } from '@hooks/useDebounce'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'

// ============================================
// KONTAKT TURI BADGE
// ============================================
function ContactTypeBadge({ type }: { type: ContactType }) {
  const t = useT()
  const map = {
    CUSTOMER: { label: t('contacts.customer'),             variant: 'success'  as const },
    SUPPLIER: { label: t('contacts.supplier'),       variant: 'warning'  as const },
    BOTH:     { label: `${t('contacts.customer')}/${t('contacts.supplier')}`, variant: 'info'     as const },
    PARTNER:  { label: t('contacts.partner'),            variant: 'primary'  as const },
  }
  const c = map[type]
  return <Badge variant={c.variant} size="sm">{c.label}</Badge>
}

// ============================================
// KONTAKT QATORI
// ============================================
function ContactRow({
  contact,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onView,
}: {
  contact:  Contact
  selected: boolean
  onToggle: (id: string) => void
  onEdit:   (c: Contact) => void
  onDelete: (c: Contact) => void
  onView:   (c: Contact) => void
}) {
  const t = useT()
  return (
    <tr className={cn(
      'border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group',
      selected && 'bg-accent-primary/5',
    )}>

      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(contact.id)}
          className="w-3.5 h-3.5 rounded border-border-primary accent-accent-primary cursor-pointer"
        />
      </td>

      {/* Avatar + Ism */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-text-secondary">
              {getInitials(contact.name)}
            </span>
          </div>
          <div className="min-w-0">
            <button
              onClick={() => onView(contact)}
              className="text-sm font-medium text-text-primary hover:text-accent-primary transition-colors truncate block max-w-[200px] text-left"
            >
              {contact.name}
            </button>
            {contact.legalName && (
              <p className="text-xs text-text-muted truncate max-w-[200px]">
                {contact.legalName}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Tur */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <ContactTypeBadge type={contact.type} />
          {(contact as any).priceLevel === 'WHOLESALE' && (
            <Badge variant="success" size="sm">Ulgurji</Badge>
          )}
          {(contact as any).priceLevel === 'VIP' && (
            <Badge variant="primary" size="sm">⭐ VIP</Badge>
          )}
        </div>
      </td>

      {/* Telefon */}
      <td className="px-4 py-3">
        {contact.phone ? (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Phone size={13} className="text-text-muted" />
            {formatPhone(contact.phone)}
          </a>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Viloyat */}
      <td className="px-4 py-3">
        {contact.region ? (
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <MapPin size={13} className="text-text-muted" />
            {contact.region}
          </div>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Debitor */}
      <td className="px-4 py-3 text-right">
        {(contact.totalReceivable ?? 0) > 0 ? (
          <div>
            <p className={cn(
              'text-sm font-medium tabular-nums',
              contact.hasOverdue ? 'text-danger' : 'text-success',
            )}>
              {formatCurrency(contact.totalReceivable!)}
            </p>
            {contact.hasOverdue && (
              <p className="text-[10px] text-danger">{t('contacts.overdueLabel')}</p>
            )}
          </div>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Kreditor */}
      <td className="px-4 py-3 text-right">
        {(contact.totalPayable ?? 0) > 0 ? (
          <p className="text-sm font-medium text-warning tabular-nums">
            {formatCurrency(contact.totalPayable!)}
          </p>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Amallar */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="xs" onClick={() => onView(contact)}>
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => onEdit(contact)}>
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onDelete(contact)}
            className="hover:text-danger hover:bg-danger/10"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ============================================
// TYPE TABS
// ============================================
const TYPE_TABS = [
  { id: 'ALL',      tKey: 'common.all' },
  { id: 'CUSTOMER', tKey: 'contacts.customers' },
  { id: 'SUPPLIER', tKey: 'contacts.suppliers' },
  { id: 'BOTH',     tKey: 'contacts.both' },
]

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ContactsListPage() {
  const navigate = useNavigate()
  const t = useT()

  // URL search params — source of truth for type filter
  // (so sidebar sub-tabs and in-page tabs stay in sync)
  const [searchParams, setSearchParams] = useSearchParams()
  const typeFromUrl = searchParams.get('type')?.toUpperCase() ?? 'ALL'
  const validTypes = ['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH']
  const typeTab = validTypes.includes(typeFromUrl) ? typeFromUrl : 'ALL'

  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editContact,  setEditContact]  = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())

  const debouncedSearch  = useDebounce(search, 400)
  // search yoki filter o'zgarganda birinchi sahifaga qaytish
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleTab    = (v: string) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'ALL') next.delete('type')
    else next.set('type', v)
    setSearchParams(next, { replace: true })
    setPage(1)
  }
  const deleteMutation   = useDeleteContact()
  const bulkDeleteMut    = useBulkDeleteContacts()

  const query = {
    search:    debouncedSearch || undefined,
    type:      typeTab !== 'ALL' ? typeTab : undefined,
    page,
    limit:     50,
    sortBy:    'name',
    sortOrder: 'asc' as const,
  }

  const { data, isLoading }   = useContacts(query)
  const { data: stats }       = useContactStats()

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll  = useCallback(() => {
    setSelectedIds(new Set(data?.data.map(c => c.id) ?? []))
  }, [data])

  const clearSelect = useCallback(() => setSelectedIds(new Set()), [])

  const searchRef = useRef<HTMLInputElement>(null)
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, handler: () => { setEditContact(null); setFormOpen(true) } },
    { key: '/', skipInput: true, handler: () => searchRef.current?.focus() },
  ])

  const handleExport = async () => {
    try {
      const all = await contactService.exportData({ type: typeTab !== 'ALL' ? typeTab : undefined, search: debouncedSearch || undefined })
      const rows = all.map(c => ({
        'Nomi':          c.name,
        'Turi':          c.type === 'CUSTOMER' ? 'Mijoz' : c.type === 'SUPPLIER' ? 'Yetkazuvchi' : 'Ikkalasi',
        'Telefon':       c.phone ?? '',
        'Email':         c.email ?? '',
        'Viloyat':       c.region ?? '',
        'Manzil':        c.address ?? '',
        'Qarz limiti':   c.creditLimit ?? 0,
        'STIR':          c.stir ?? '',
        'Yuridik nomi':  c.legalName ?? '',
        'Izoh':          c.notes ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Kontaktlar')
      XLSX.writeFile(wb, `bizzo-kontaktlar-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      toast.error('Eksport muvaffaqiyatsiz')
    }
  }

  const handleEdit = useCallback((c: Contact) => {
    setEditContact(c)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((c: Contact) => {
    setDeleteTarget(c)
  }, [])

  const handleView = useCallback((c: Contact) => {
    navigate(`/contacts/${c.id}`)
  }, [navigate])

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditContact(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const tabCount: Record<string, number | undefined> = {
    ALL:      stats?.total,
    CUSTOMER: stats?.customers,
    SUPPLIER: stats?.suppliers,
  }

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={t('nav.contacts')}
        description={t('contacts.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.contacts') },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExport}>
              {t('common.export')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setFormOpen(true)}
              title="Ctrl+N"
            >
              {t('contacts.newContact')}
            </Button>
          </>
        }
      />

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('contacts.total')}
          value={stats?.total ?? '—'}
          icon={<Users size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={!stats}
        />
        <KPICard
          title={t('contacts.debtorKpi')}
          value={stats ? formatCurrency(stats.totalReceivable) : '—'}
          subtitle={`${stats?.withDebt ?? 0} ${t('contacts.contactsCount')}`}
          icon={<TrendingUp size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={!stats}
        />
        <KPICard
          title={t('contacts.creditorKpi')}
          value={stats ? formatCurrency(stats.totalPayable) : '—'}
          icon={<TrendingDown size={18} />}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          loading={!stats}
        />
        <KPICard
          title={t('contacts.overdueKpi')}
          value={stats?.overdue ?? '—'}
          subtitle={t('contacts.contactsCount')}
          icon={<AlertCircle size={18} />}
          iconColor="text-danger"
          iconBg="bg-danger/10"
          loading={!stats}
        />
      </div>

      {/* Jadval */}
      <Card padding="none">
        {/* Filtr qatori */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          <Input
            ref={searchRef}
            placeholder={`${t('contacts.searchPlaceholder')} (/)`}
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="sm:max-w-xs"
          />

          {/* Type tabs */}
          <div className="flex items-center gap-1">
            {TYPE_TABS.map(tab => {
              const count = tabCount[tab.id]
              const active = typeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  )}
                >
                  {t(tab.tKey)}
                  {count !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                      active
                        ? 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-bg-elevated text-text-muted',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bulk action bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={data?.data.length ?? 0}
          onSelectAll={selectAll}
          onClearAll={clearSelect}
          actions={[
            {
              label:   "O'chirish",
              icon:    <Trash2 size={13} />,
              variant: 'danger',
              loading: bulkDeleteMut.isPending,
              onClick: () => bulkDeleteMut.mutate([...selectedIds], { onSuccess: clearSelect }),
            },
          ]}
        />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={!!data?.data.length && selectedIds.size === data.data.length}
                    onChange={() => selectedIds.size === data?.data.length ? clearSelect() : selectAll()}
                    className="w-3.5 h-3.5 rounded border-border-primary accent-accent-primary cursor-pointer"
                  />
                </th>
                {[
                  { key: 'contact', label: t('contacts.colContact'), align: 'left' },
                  { key: 'type', label: t('contacts.colType'), align: 'left' },
                  { key: 'phone', label: t('contacts.colPhone'), align: 'left' },
                  { key: 'region', label: t('contacts.colRegion'), align: 'left' },
                  { key: 'debtor', label: t('contacts.colDebtor'), align: 'right' },
                  { key: 'creditor', label: t('contacts.colCreditor'), align: 'right' },
                  { key: 'actions', label: '', align: 'right' },
                ].map(h => (
                  <th
                    key={h.key}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      h.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={8} />
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Users size={28} />}
                      title={t('contacts.notFound')}
                      description={
                        search
                          ? t('contacts.searchEmpty', { query: search })
                          : t('contacts.addFirst')
                      }
                      action={
                        !search
                          ? { label: t('contacts.addContact'), onClick: () => setFormOpen(true) }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                data.data.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    selected={selectedIds.has(c.id)}
                    onToggle={toggleSelect}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          total={data?.meta.total}
          onPage={setPage}
        />
      </Card>

      {/* Forma modal */}
      <ContactFormModal
        open={formOpen}
        onClose={handleCloseForm}
        contact={editContact}
      />

      {/* O'chirish tasdiqlash */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('contacts.confirmDelete', { name: deleteTarget?.name || '' })}
        description={t('contacts.confirmDeleteDesc')}
        confirmText={t('common.delete')}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
