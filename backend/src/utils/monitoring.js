// Error reporting is optional: set SENTRY_DSN to turn it on. The SDK is only
// loaded when configured, so an unconfigured install costs nothing at runtime.
let sentry = null

export async function initMonitoring() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return false

  const Sentry = await import('@sentry/node')
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0
  })

  sentry = Sentry
  return true
}

export function captureException(error, context = {}) {
  if (!sentry) return

  sentry.withScope((scope) => {
    scope.setExtras(context)
    sentry.captureException(error)
  })
}
