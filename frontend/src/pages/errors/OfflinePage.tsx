import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@components/ui/Button/Button'

export default function OfflinePage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="w-20 h-20 rounded-3xl bg-warning/10 border border-warning/20 flex items-center justify-center mb-6">
        <WifiOff size={36} className="text-warning" />
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Internet aloqasi yo'q
      </h1>
      <p className="text-sm text-text-muted mb-8 max-w-xs leading-relaxed">
        BIZZO ga ulanish uchun internet aloqasi kerak. Tarmoq ulanishingizni tekshiring va qayta urinib ko'ring.
      </p>

      <Button
        variant="primary"
        leftIcon={<RefreshCw size={15} />}
        onClick={() => window.location.reload()}
      >
        Qayta urinish
      </Button>

      <p className="text-xs text-text-muted mt-6 opacity-60">
        Oldingi ma'lumotlar mahalliy xotirada saqlanishi mumkin
      </p>
    </div>
  )
}
