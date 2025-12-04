/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: { bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0' },
        rpg: { gold: '#fbbf24', red: '#ef4444', blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6' }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'damage-pop': 'damagePop 0.5s ease-out forwards',
        'screen-shake': 'screenShake 0.4s cubic-bezier(.36,.07,.19,.97) both',
        'flash-red': 'flashRed 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        },
        screenShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-8px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(8px)' }
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
          '100%': { backgroundColor: 'transparent' }
        },
        damagePop: {
          '0%': { transform: 'scale(0.5)', opacity: 0 },
          '50%': { transform: 'scale(1.2)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        }
      }
    }
  },
  plugins: [],
}
