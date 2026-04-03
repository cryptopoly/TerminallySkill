import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          light: 'var(--surface-light)',
          lighter: 'var(--surface-lighter)',
          border: 'var(--surface-border)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)'
        },
        // Override gray scale with CSS vars so the light theme can flip them
        gray: {
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)'
        },
        safe: '#22c55e',
        caution: '#f59e0b',
        destructive: '#ef4444'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config
