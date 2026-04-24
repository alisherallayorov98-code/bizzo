import { useState, useRef, DragEvent } from 'react'
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { cn }            from '@utils/cn'
import { uploadService } from '@services/upload.service'
import toast             from 'react-hot-toast'

interface ImageUploadProps {
  value?:       string | null
  onChange:     (url: string | null) => void
  size?:        'sm' | 'md' | 'lg'
  aspectRatio?: 'square' | 'wide'
  label?:       string
  hint?:        string
}

export function ImageUpload({
  value, onChange, size = 'md', aspectRatio = 'square', label, hint,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClass = {
    sm: 'w-20 h-20',
    md: aspectRatio === 'wide' ? 'w-full h-32' : 'w-32 h-32',
    lg: aspectRatio === 'wide' ? 'w-full h-48' : 'w-48 h-48',
  }[size]

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm yuklash mumkin')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5 MB dan kichik bo'lishi kerak")
      return
    }
    setUploading(true)
    try {
      const result = await uploadService.uploadImage(file)
      onChange(result.url)
      toast.success('Rasm yuklandi ✓')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Yuklashda xatolik')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-text-secondary mb-1.5 block">{label}</label>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !value && !uploading && inputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed overflow-hidden group transition-all',
          sizeClass,
          !value && 'cursor-pointer',
          dragging
            ? 'border-accent-primary bg-accent-primary/10'
            : value
              ? 'border-border-primary'
              : 'border-border-primary hover:border-accent-primary/50 hover:bg-bg-tertiary/50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 backdrop-blur-sm">
            <Loader2 size={24} className="animate-spin text-accent-primary" />
          </div>
        ) : value ? (
          <>
            <img src={value} alt="Upload" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                className="p-2 rounded-lg bg-white/20 backdrop-blur text-white hover:bg-white/30 transition-colors"
              >
                <Upload size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onChange(null) }}
                className="p-2 rounded-lg bg-danger/80 text-white hover:bg-danger transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted px-2 text-center">
            <ImageIcon size={size === 'sm' ? 18 : 24} className="mb-1.5 opacity-60" />
            <p className="text-xs font-medium">{size === 'sm' ? 'Rasm' : 'Rasm yuklash'}</p>
            {size !== 'sm' && (
              <p className="text-[10px] opacity-60 mt-1 hidden sm:block">yoki torting</p>
            )}
          </div>
        )}
      </div>

      {hint && <p className="text-[10px] text-text-muted mt-1">{hint}</p>}
    </div>
  )
}
