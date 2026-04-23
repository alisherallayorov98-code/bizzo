import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary:  'var(--color-bg-tertiary)',
          elevated:  'var(--color-bg-elevated)',
        },
        border: {
          primary:   'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          focus:     'var(--color-border-focus)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          hover:   'var(--color-accent-hover)',
          light:   'var(--color-accent-light)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger:  'var(--color-danger)',
        info:    'var(--color-info)',
        module: {
          crm:        'var(--color-module-crm)',
          warehouse:  'var(--color-module-warehouse)',
          hr:         'var(--color-module-hr)',
          waste:      'var(--color-module-waste)',
          construct:  'var(--color-module-construct)',
          production: 'var(--color-module-production)',
          finance:    'var(--color-module-finance)',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-right':   'slideRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'pulse-glow':    'pulseGlow 2s infinite',
        'shimmer':       'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight:  { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-100%)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseGlow:   { '0%,100%': { boxShadow: '0 0 5px rgba(59,130,246,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(59,130,246,0.6)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

export default config
