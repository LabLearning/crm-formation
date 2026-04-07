import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf3', 100: '#d1fae2', 200: '#a7f3c9', 300: '#6BC291',
          400: '#4eba7a', 500: '#195245', 600: '#134439', 700: '#0f3a30',
          800: '#0b2e25', 900: '#07231b', 950: '#041610',
        },
        surface: {
          0: '#FFFFFF', 50: '#FAFAFA', 100: '#F5F5F4', 200: '#E7E5E4',
          300: '#D6D3D1', 400: '#A8A29E', 500: '#78716C', 600: '#57534E',
          700: '#44403C', 800: '#292524', 900: '#1C1917', 950: '#0C0A09',
        },
        success: { 50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
        danger: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        accent: { 50: '#FFF7ED', 500: '#F97316', 600: '#EA580C' },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
      },
      letterSpacing: { 'display': '-0.035em', 'heading': '-0.025em', 'tight': '-0.015em' },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'card': '0 2px 8px -2px rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
        'elevated': '0 8px 24px -8px rgb(0 0 0 / 0.08), 0 2px 8px -4px rgb(0 0 0 / 0.04)',
        'modal': '0 24px 80px -16px rgb(0 0 0 / 0.15), 0 8px 24px -8px rgb(0 0 0 / 0.06)',
        'glow': '0 0 0 1px rgb(25 82 69 / 0.08), 0 4px 16px -4px rgb(107 194 145 / 0.12)',
      },
      borderRadius: { 'xl': '0.75rem', '2xl': '1rem', '3xl': '1.25rem', '4xl': '1.5rem' },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40V0h40' fill='none' stroke='%23e7e5e4' stroke-width='0.5'/%3E%3C/svg%3E\")",
        'gradient-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.06) 50%, transparent 75%)',
      },
      animation: {
        'in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'in-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'in-down': 'fadeDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'in-scale': 'fadeScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left': 'slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'fadeScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeScale: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        slideLeft: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
