/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // PlaceIQ design tokens
        navy: { DEFAULT: '#17243A', 700: '#1E2E48', 600: '#273A58' },
        canvas: '#F5F7FB',
        ink: '#172033',
        muted: '#64748B',
        line: '#E5EAF1',
        brand: { DEFAULT: '#2563EB', hover: '#1D4ED8', soft: '#EFF4FF' },
        success: { DEFAULT: '#15803D', soft: '#F0FDF4' },
        warning: { DEFAULT: '#B45309', soft: '#FFFBEB' },
        danger: { DEFAULT: '#B91C1C', soft: '#FEF2F2' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        pop: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
