import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
    // Sentry ixtiyoriy — VITE_SENTRY_DSN bo'lsa va @sentry/react o'rnatilgan bo'lsa
    if (import.meta.env.VITE_SENTRY_DSN) {
      // @ts-ignore — ixtiyoriy paket
      import(/* @vite-ignore */ '@sentry/react').then((S: any) => {
        S.captureException?.(error, { extra: { componentStack: info.componentStack } })
      }).catch(() => { /* paket o'rnatilmagan */ })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={36} className="text-danger" />
            </div>
            <h1 className="font-display font-black text-2xl text-text-primary mb-3">
              Xatolik yuz berdi
            </h1>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko'ring.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-[10px] text-danger bg-danger/5 p-3 rounded-lg text-left mb-4 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Qayta yuklash
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary text-sm font-medium hover:bg-bg-elevated border border-border-primary transition-colors"
              >
                Dashboard ga
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
