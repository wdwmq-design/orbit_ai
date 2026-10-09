/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        obs: {
          950: '#07090e',
          900: '#0b0f17',
          850: '#0f141f',
          800: '#141a29',
          750: '#182133',
          700: '#1e293f',
          600: '#283754',
          500: '#394b70',
          400: '#526b99',
          300: '#7d95c4',
          200: '#adc1e6',
          100: '#dce6f7',
        },
        cyan: {
          bright: '#38bdf8',
          DEFAULT: '#0284c7',
          dim: '#0369a1',
          muted: '#0c4a6e',
          glow: 'rgba(56, 189, 248, 0.15)',
        },
        mint: {
          bright: '#34d399',
          DEFAULT: '#10b981',
          dim: '#059669',
          muted: '#064e3b',
        },
        amber: {
          bright: '#fbbf24',
          DEFAULT: '#f59e0b',
          dim: '#d97706',
          muted: '#78350f',
        },
        crimson: {
          bright: '#fb7185',
          DEFAULT: '#f43f5e',
          dim: '#e11d48',
          muted: '#881337',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.05)',
        'glow-electric': '0 0 15px -3px rgba(56, 189, 248, 0.3)',
      }
    },
  },
  plugins: [],
}
