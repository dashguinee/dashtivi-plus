/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#050508',
          dark: '#0A0A0A',
          surface: 'rgba(20, 20, 25, 0.8)',
          card: '#242424',
          'card-hover': '#2E2E2E',
          elevated: 'rgba(30, 30, 38, 0.9)',
          hover: 'rgba(40, 40, 50, 0.9)',
        },
        primary: {
          DEFAULT: '#9D4EDD',
          light: '#C77DFF',
          dark: '#7B2CBF',
          deeper: '#2D1B4E',
          glow: 'rgba(157, 78, 221, 0.3)',
        },
        cyan: {
          DEFAULT: '#00F5FF',
          dark: '#00D9FF',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8F5E',
          gold: '#FFD700',
          red: '#FF006E',
          green: '#06FFA5',
          'neon-blue': '#00D4FF',
        },
        success: '#00C853',
        warning: '#FFB300',
        error: '#FF5252',
        text: {
          primary: '#FFFFFF',
          secondary: '#B8B8B8',
          muted: '#6B6B6B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in-down': 'fade-in-down 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'scale-in': 'scale-in 0.3s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
        'ken-burns': 'ken-burns 20s ease-in-out infinite',
        'portal-pulse-red': 'portal-pulse-red 2.5s ease-in-out infinite',
        'portal-pulse-blue': 'portal-pulse-blue 2.5s ease-in-out infinite',
        'mood-pop': 'mood-pop 0.3s ease-out',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow': {
          from: { boxShadow: '0 0 5px rgba(157, 78, 221, 0.2)' },
          to: { boxShadow: '0 0 20px rgba(157, 78, 221, 0.6)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(157, 78, 221, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(157, 78, 221, 0.35)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'ken-burns': {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '50%': { transform: 'scale(1.1) translate(-2%, -1%)' },
          '100%': { transform: 'scale(1) translate(0, 0)' },
        },
        'portal-pulse-red': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.2)' },
        },
        'portal-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2)' },
        },
        'mood-pop': {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
