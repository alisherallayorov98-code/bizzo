import { useRef, useState }        from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Paperclip, Upload, Trash2, Download, Eye,
  FileText, FileImage, FileSpreadsheet, File,
} from 'lucide-react'
import { attachmentsService } from '@services/attachments.service'
import type { Attachment }    from '@services/attachments.service'
import { formatDate }         from '@utils/formatters'
import { cn }                 from '@utils/cn'
import toast                  from 'react-hot-toast'

interface AttachmentListProps {
  entityType: string
  entityId:   string
  editable?:  boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/'))        return <FileImage       className={className} />
  if (mimeType === 'application/pdf')       return <FileText        className={className} />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
                                            return <FileSpreadsheet className={className} />
  if (mimeType.includes('word'))            return <FileText        className={className} />
  return <File className={className} />
}

export function AttachmentList({ entityType, entityId, editable = true }: AttachmentListProps) {
  const qc       = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn:  () => attachmentsService.list(entityType, entityId),
    enabled:  !!entityId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsService.uploadAndLink(file, entityType, entityId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      toast.success('Fayl biriktirildi ✓')
    },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
    onSettled:  () => setUploading(false),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentsService.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      toast.success("O'chirildi")
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" — 10 MB dan katta`)
        return
      }
      setUploading(true)
      uploadMutation.mutate(file)
    })
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    Array.from(e.dataTransfer.files).forEach(file => {
      setUploading(true)
      uploadMutation.mutate(file)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Paperclip size={14} />
          Biriktirilgan fayllar
          {(attachments?.length ?? 0) > 0 && (
            <span className="text-text-muted">({attachments?.length})</span>
          )}
        </h3>

        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors disabled:opacity-50"
            >
              <Upload size={12} />
              {uploading ? 'Yuklanmoqda...' : "Fayl qo'shish"}
            </button>
          </>
        )}
      </div>

      {editable && (!attachments || attachments.length === 0) && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border-primary rounded-xl p-6 text-center hover:border-accent-primary/50 hover:bg-bg-tertiary/50 transition-all cursor-pointer"
        >
          <Paperclip size={24} className="mx-auto text-text-muted opacity-40 mb-2" />
          <p className="text-sm text-text-muted">Fayllarni bu yerga tashlang yoki bosing</p>
          <p className="text-xs text-text-muted opacity-60 mt-1">PDF, Word, Excel, rasm · 10 MB gacha</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 rounded-lg bg-bg-tertiary animate-pulse" />
          ))}
        </div>
      ) : attachments && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att: Attachment) => {
            const isImage = att.mimeType.startsWith('image/')
            return (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border-primary hover:border-border-secondary bg-bg-tertiary/30 hover:bg-bg-tertiary/60 transition-colors group"
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isImage ? 'overflow-hidden' : 'bg-bg-tertiary border border-border-primary',
                )}>
                  {isImage
                    ? <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                    : <FileTypeIcon mimeType={att.mimeType} className="w-5 h-5 text-text-muted" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{att.fileName}</p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(att.fileSize)} · {att.uploadedBy?.firstName} {att.uploadedBy?.lastName} · {formatDate(att.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isImage && (
                    <a
                      href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                    >
                      <Eye size={14} />
                    </a>
                  )}
                  <a
                    href={att.fileUrl} download={att.fileName}
                    className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                  >
                    <Download size={14} />
                  </a>
                  {editable && (
                    <button
                      onClick={() => deleteMutation.mutate(att.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
