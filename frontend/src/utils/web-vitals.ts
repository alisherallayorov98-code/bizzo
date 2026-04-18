type Metric = { name: string; value: number; id: string }

const THRESHOLDS: Record<string, number> = {
  FCP:  1800,
  LCP:  2500,
  FID:  100,
  CLS:  0.1,
  TTFB: 800,
  INP:  200,
}

export function reportWebVitals(metric: Metric) {
  if (import.meta.env.DEV) {
    const threshold = THRESHOLDS[metric.name]
    const isGood = threshold ? metric.value < threshold : true
    const label = isGood ? 'OK' : 'SLOW'
    console[isGood ? 'log' : 'warn'](
      `[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} [${label}]`,
    )
  }
}
