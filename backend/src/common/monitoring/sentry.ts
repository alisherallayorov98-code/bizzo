/**
 * Sentry integratsiyasi — ixtiyoriy. @sentry/node o'rnatilgan bo'lsa faollashadi.
 * Install: npm i @sentry/node
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      release: process.env.APP_VERSION,
    });
    // eslint-disable-next-line no-console
    console.log('[Sentry] initialized');
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[Sentry] SENTRY_DSN berilgan, lekin @sentry/node o\'rnatilmagan');
  }
}

export function captureException(err: unknown, context?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    if (context) Sentry.setContext('app', context);
    Sentry.captureException(err);
  } catch { /* noop */ }
}
