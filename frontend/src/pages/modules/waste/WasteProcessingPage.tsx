import { useState } from 'react'
import { Scale, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { PageHeader }   from '@components/layout/PageHeader/PageHeader'
import { Card }         from '@components/ui/Card/Card'
import { Button }       from '@components/ui/Button/Button'
import { Modal }        from '@components/ui/Modal/Modal'
import { Input }        from '@components/ui/Input/Input'
import { Skeleton }     from '@components/ui/Skeleton/Skeleton'
import {
  useWasteBatches, useCreateProcessing, useQualityTypes,
} from '@features/waste-module/hooks/useWaste'
import { formatWeight, formatCurrency, formatPercent } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'
import type { WasteBatch } from '@services/waste.service'

function ProcessingModal({
  batch,
  onClose,
}: {
  batch:   WasteBatch
  onClose: () => void
}) {
  const t = useT()
  const { data: qualityTypes } = useQualityTypes()
  const qt = qualityTypes?.find(q => q.id === batch.qualityTypeId)

  const [form, setForm] = useState({
    processedWeight: '',
    outputWeight:    '',
    outputNotes:     '',
  })

  const create = useCreateProcessing()

  const processedW = parseFloat(form.processedWeight) || 0
  const outputW    = parseFloat(form.outputWeight)    || 0
  const lossW      = processedW - outputW
  const lossP      = processedW > 0 ? (lossW / processedW) * 100 : 0

  const isAnomaly = qt && processedW > 0
    ? lossP > qt.expectedLossMax * 1.5
    : false

  const isValid =
    processedW > 0 &&
    outputW >= 0 &&
    outputW <= processedW &&
    processedW <= (batch.remaining ?? batch.inputWeight)

  const handleSubmit = async () => {
    await create.mutateAsync({
      batchId:         batch.id,
      processedWeight: processedW,
      outputWeight:    outputW,
      outputNotes:     form.outputNotes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('waste.processingModalTitle')}
      description={`${batch.batchNumber}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={isAnomaly ? 'danger' : 'primary'}
            size="sm"
            loading={create.isPending}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {isAnomaly ? t('waste.saveAnyway') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('waste.qualityTypeLabel').replace(' *', '')}</span>
            <span className="font-medium text-text-primary">{qt?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('waste.remainingWeight')}</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatWeight(batch.remaining ?? batch.inputWeight)}
            </span>
          </div>
          {qt && (
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('waste.expectedLoss')}</span>
              <span className="text-text-secondary tabular-nums">
                {qt.expectedLossMin}–{qt.expectedLossMax}%
              </span>
            </div>
          )}
        </div>

        <Input
          label={t('waste.processedWeightLabel')}
          type="number"
          placeholder="0.00"
          leftIcon={<Scale size={14} />}
          value={form.processedWeight}
          onChange={e => setForm(f => ({ ...f, processedWeight: e.target.value }))}
          hint={`Max: ${formatWeight(batch.remaining ?? batch.inputWeight)}`}
        />

        <Input
          label={t('waste.outputWeightLabel')}
          type="number"
          placeholder="0.00"
          leftIcon={<Scale size={14} />}
          value={form.outputWeight}
          onChange={e => setForm(f => ({ ...f, outputWeight: e.target.value }))}
        />

        {processedW > 0 && (
          <div className={cn(
            'p-3 rounded-lg border space-y-1.5 text-sm',
            isAnomaly
              ? 'bg-danger/5 border-danger/30'
              : lossP <= (qt?.expectedLossMax ?? 50)
              ? 'bg-success/5 border-success/30'
              : 'bg-warning/5 border-warning/30',
          )}>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('waste.lossWeightResult')}</span>
              <span className={cn('font-semibold tabular-nums', isAnomaly ? 'text-danger' : 'text-warning')}>
                {formatWeight(Math.max(0, lossW))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">{t('waste.lossPercentResult')}</span>
              <div className="flex items-center gap-1.5">
                <span className={cn('font-bold tabular-nums text-base', isAnomaly ? 'text-danger' : 'text-warning')}>
                  {formatPercent(lossP)}
                </span>
                {isAnomaly ? (
                  <AlertTriangle size={14} className="text-danger" />
                ) : (
                  <CheckCircle size={14} className="text-success" />
                )}
              </div>
            </div>
            {isAnomaly && (
              <p className="text-xs text-danger font-medium text-center pt-1">
                {t('waste.anomalyWarning', { max: formatPercent(qt!.expectedLossMax * 1.5) })}
              </p>
            )}
          </div>
        )}

        <Input
          label={t('sales.notesOptional')}
          placeholder="Mahsulot haqida ma'lumot..."
          value={form.outputNotes}
          onChange={e => setForm(f => ({ ...f, outputNotes: e.target.value }))}
        />
      </div>
    </Modal>
  )
}

export default function WasteProcessingPage() {
  const t = useT()
  const [selectedBatch, setSelectedBatch] = useState<WasteBatch | null>(null)

  const { data, isLoading } = useWasteBatches({
    status: 'IN_STOCK',
    limit:  50,
    page:   1,
  })

  const HEADERS = [
    t('waste.colBatchNum'), t('waste.colQualityType'), t('waste.colSource'),
    t('waste.colInputWeight'), t('waste.colRemaining'), t('common.price'), '',
  ]

  return (
    <div>
      <PageHeader
        title={t('waste.processingTitle')}
        description={t('waste.processingDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('waste.processingTitle'), path: '/modules/waste' },
          { label: t('waste.processingTitle') },
        ]}
      />

      <Card padding="none">
        <div className="p-4 border-b border-border-primary">
          <h3 className="font-semibold text-text-primary">{t('waste.waitingBatches')}</h3>
          <p className="text-xs text-text-muted mt-0.5">{t('waste.readyBatchesSub')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-text-muted">
                    <Scale size={32} className="mx-auto mb-2 opacity-30" />
                    {t('waste.noBatchesForProcessing')}
                  </td>
                </tr>
              ) : (
                data.data.map((batch: WasteBatch) => (
                  <tr
                    key={batch.id}
                    className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-accent-primary">
                        {batch.batchNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {batch.qualityType ? (
                        <span className="text-sm text-text-primary">{batch.qualityType.name}</span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary">
                        {batch.sourceType === 'CITIZEN'
                          ? batch.citizenName ?? '—'
                          : t('waste.supplier')}
                      </div>
                      <div className="text-xs text-text-muted">
                        {batch.sourceType === 'CITIZEN' ? t('waste.citizen') : t('waste.deliverer')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-primary">
                        {formatWeight(batch.inputWeight)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums font-medium text-text-primary">
                        {formatWeight(batch.remaining ?? batch.inputWeight)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-secondary">
                        {formatCurrency(batch.pricePerKg)}/kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="primary"
                        size="xs"
                        rightIcon={<ChevronRight size={12} />}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedBatch(batch)}
                      >
                        {t('waste.processBtn')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedBatch && (
        <ProcessingModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </div>
  )
}
