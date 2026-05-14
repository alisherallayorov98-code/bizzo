import { useState } from 'react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { FileDown, Eye, X, Loader2 } from 'lucide-react'
import { Button } from '@components/ui/Button/Button'
import { Modal }  from '@components/ui/Modal/Modal'

interface PDFDownloadButtonProps {
  document:    React.ReactElement
  fileName:    string
  label?:      string
  size?:       'xs' | 'sm' | 'md'
  variant?:    'primary' | 'secondary'
  showPreview?: boolean
}

export function PDFDownloadButton({
  document: doc, fileName, label = 'PDF', size = 'sm',
  variant = 'secondary', showPreview = false,
}: PDFDownloadButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <PDFDownloadLink document={doc} fileName={fileName}>
        {(({ loading }: { loading: boolean }) => (
          <Button variant={variant} size={size}
            leftIcon={loading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            disabled={loading}>
            {loading ? 'Tayyorlanmoqda...' : label}
          </Button>
        )) as any}
      </PDFDownloadLink>

      {showPreview && (
        <>
          <Button variant="secondary" size={size}
            leftIcon={<Eye size={13} />}
            onClick={() => setPreviewOpen(true)}>
            Ko'rish
          </Button>
          {previewOpen && (
            <Modal open onClose={() => setPreviewOpen(false)} title="PDF ko'rish" size="xl">
              <PDFViewer style={{ width: '100%', height: '70vh', border: 'none' }}>
                {doc}
              </PDFViewer>
            </Modal>
          )}
        </>
      )}
    </div>
  )
}

// Simpler inline download button (no preview)
export function PDFIconButton({ document: doc, fileName, title = 'PDF yuklab olish' }: {
  document: React.ReactElement; fileName: string; title?: string
}) {
  return (
    <PDFDownloadLink document={doc} fileName={fileName} title={title}>
      {(({ loading }: { loading: boolean }) => (
        <button
          className="p-1.5 rounded-lg transition-all hover:opacity-80"
          style={{
            background: loading ? 'var(--color-bg-tertiary)' : 'var(--color-accent-primary)20',
          }}
          title={title}
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            : <FileDown size={13} style={{ color: 'var(--color-accent-primary)' }} />
          }
        </button>
      )) as any}
    </PDFDownloadLink>
  )
}
