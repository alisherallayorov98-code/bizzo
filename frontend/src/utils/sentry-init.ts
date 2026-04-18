/**
 * Frontend Sentry — ixtiyoriy. @sentry/react o'rnatilgan va VITE_SENTRY_DSN bo'lsa faol.
 * Install: npm i @sentry/react
 */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  try {
    // @ts-ignore — ixtiyoriy paket
    const Sentry: any = await import(/* @vite-ignore */ '@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
  } catch {
    console.warn('[Sentry] VITE_SENTRY_DSN berilgan, lekin @sentry/react o\'rnatilmagan')
  }
}
