/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        background: '#07070a',
        surface: 'rgba(255,255,255,0.04)',
        surfaceHover: 'rgba(255,255,255,0.08)',
        surfaceActive: 'rgba(255,255,255,0.12)',
        textPrimary: '#ffffff',
        textSecondary: '#a1a1aa',
        primary: '#7c3aed',
        primaryLight: '#a78bfa',
        secondary: '#06b6d4',
        accent: '#ec4899',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      backgroundImage: {
        'aurora': 'radial-gradient(ellipse at top left, rgba(124, 58, 237, 0.15) 0%, transparent 40%), radial-gradient(ellipse at top right, rgba(236, 72, 153, 0.1) 0%, transparent 40%), radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.1) 0%, transparent 40%)',
      },
      animation: {
        'aurora-pan': 'aurora-pan 15s ease-in-out infinite alternate',
      },
      keyframes: {
        'aurora-pan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' }
        }
      }
    },
  },
  plugins: [],
}
