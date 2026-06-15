import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './electron/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        nexa: {
          bg: '#07071a',
          surface: '#0f0f2e',
          border: '#2d2d6b',
          accent: '#a855f7',
          accent2: '#06b6d4',
          muted: '#64748b',
          text: '#ffffff',
          danger: '#f87171',
          warning: '#fbbf24',
          success: '#22d3ee',
        }
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '18px',
        '2xl': '20px',
        full: '99px'
      },
      fontSize: {
        '2xs': '9px',
        xs: '10px',
        sm: '11px',
        base: '12px',
        lg: '13px',
        xl: '14px',
        '2xl': '15px',
        '3xl': '30px'
      },
      animation: {
        'pulse-dot': 'pulse 2s ease-in-out infinite',
        'pulse-fast': 'pulse 1s ease-in-out infinite',
        'spin': 'spin 0.75s linear infinite',
        'spin-slow': 'spin 0.8s linear infinite',
        'progress-shrink': 'progressShrink 4s linear forwards',
        'logo-pulse': 'nexaLogoPulse 3s ease-in-out infinite',
        'overlay-in': 'overlayIn 0.3s ease-out forwards',
        'overlay-out': 'overlayOut 0.3s ease-out forwards'
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' }
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        progressShrink: {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' }
        },
        nexaLogoPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(168, 85, 247, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.7))' }
        },
        overlayIn: {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.88)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' }
        },
        overlayOut: {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.88)' }
        }
      }
    }
  },
  plugins: []
};

export default config;