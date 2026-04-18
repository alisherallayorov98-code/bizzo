module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/login', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
    },
    assert: {
      assertions: {
        'categories:performance':    ['warn',  { minScore: 0.85 }],
        'categories:accessibility':  ['error', { minScore: 0.90 }],
        'categories:best-practices': ['warn',  { minScore: 0.90 }],
        'categories:seo':            ['warn',  { minScore: 0.85 }],
        'categories:pwa':            ['warn',  { minScore: 0.80 }],
        'first-contentful-paint':    ['warn',  { maxNumericValue: 2000 }],
        'largest-contentful-paint':  ['warn',  { maxNumericValue: 2500 }],
        'total-blocking-time':       ['warn',  { maxNumericValue: 300  }],
        'cumulative-layout-shift':   ['warn',  { maxNumericValue: 0.1  }],
        'speed-index':               ['warn',  { maxNumericValue: 3000 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
}
