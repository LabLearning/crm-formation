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
        // Design system Lab Learning — pine (marque) + mint (accent) + slate froid
        brand: {
          50: '#EEF6F2', 100: '#D6EBE1', 200: '#AED8C4', 300: '#7FC0A4',
          400: '#4FA382', 500: '#205040', 600: '#183C31', 700: '#14342B',
          800: '#102A22', 900: '#0C211B', 950: '#081812',
        },
        surface: {
          0: '#FFFFFF', 50: '#F6F8FA', 100: '#EEF1F4', 200: '#E1E6EB',
          300: '#CBD3DB', 400: '#9AA6B2', 500: '#6B7885', 600: '#4E5A67',
          700: '#37414D', 800: '#232C36', 900: '#0F1720', 950: '#0A1017',
        },
        success: { 50: '#EEF6F2', 100: '#D6EBE1', 500: '#2E8362', 600: '#206A4E', 700: '#205040' },
        warning: { 50: '#FDF7EC', 100: '#FBF0DA', 500: '#E8A33D', 600: '#C9821C', 700: '#A66A15' },
        danger: { 50: '#FDF1F1', 100: '#FBE4E5', 500: '#E5484D', 600: '#C8353A', 700: '#A82A2E' },
        accent: { 50: '#E4FBF0', 100: '#E4FBF0', 200: '#BCF2D9', 300: '#8DEAC0', 400: '#5CD9A0', 500: '#38C588', 600: '#22A972' },
        info: { 50: '#EFF5FE', 100: '#E4EEFE', 500: '#2F6FED', 600: '#205AD1' },
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
        // Ombres slate douces en couches (design system — jamais de noir dur)
        'xs': '0 1px 2px 0 rgb(15 23 32 / 0.04)',
        'soft': '0 1px 3px 0 rgb(15 23 32 / 0.05), 0 1px 2px -1px rgb(15 23 32 / 0.04)',
        'card': '0 1px 2px rgb(15 23 32 / 0.04), 0 4px 12px -2px rgb(15 23 32 / 0.06)',
        'elevated': '0 2px 4px rgb(15 23 32 / 0.04), 0 12px 32px -8px rgb(15 23 32 / 0.10)',
        'modal': '0 24px 80px -16px rgb(15 23 32 / 0.18), 0 8px 24px -8px rgb(15 23 32 / 0.08)',
        'glow': '0 0 0 1px rgb(32 80 64 / 0.08), 0 4px 16px -4px rgb(92 217 160 / 0.16)',
        'focus': '0 0 0 3px rgb(92 217 160 / 0.35)',
      },
      borderRadius: { 'xl': '0.75rem', '2xl': '1rem', '3xl': '1.25rem', '4xl': '1.5rem' },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40V0h40' fill='none' stroke='%23E1E6EB' stroke-width='0.5'/%3E%3C/svg%3E\")",
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
