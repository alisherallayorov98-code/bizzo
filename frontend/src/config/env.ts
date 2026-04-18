export const env = {
  API_URL:       import.meta.env.VITE_API_URL       || 'http://localhost:4000/api/v1',
  WS_URL:        import.meta.env.VITE_WS_URL        || 'http://localhost:4000',
  APP_NAME:      import.meta.env.VITE_APP_NAME      || 'BiznesERP',
  APP_VERSION:   import.meta.env.VITE_APP_VERSION   || '1.0.0',
  IS_DEV:        import.meta.env.DEV,
  IS_PROD:       import.meta.env.PROD,
} as const
