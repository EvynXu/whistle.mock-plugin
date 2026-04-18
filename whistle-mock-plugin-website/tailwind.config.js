/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6ffff',
          100: '#b3ffff',
          200: '#80ffff',
          300: '#4dffff',
          400: '#1affff',
          500: '#00f0ff',
          600: '#00c2cc',
          700: '#009499',
          800: '#006666',
          900: '#003333',
        },
        cyber: {
          black: '#050508',
          dark: '#0a0a12',
          panel: '#0f0f1a',
          border: '#1a1a2e',
          cyan: '#00f0ff',
          magenta: '#ff00a0',
          yellow: '#f0e800',
          green: '#00ff41',
          purple: '#bd00ff',
          orange: '#ff6b35',
          pink: '#ff0080',
          text: '#e0e0e0',
          muted: '#6b7280',
          glow: 'rgba(0, 240, 255, 0.3)',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        'cyber-glow': '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
        'cyber-glow-magenta': '0 0 10px rgba(255, 0, 160, 0.5), 0 0 20px rgba(255, 0, 160, 0.3), 0 0 40px rgba(255, 0, 160, 0.1)',
        'cyber-glow-green': '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3), 0 0 40px rgba(0, 255, 65, 0.1)',
        'cyber-glow-yellow': '0 0 10px rgba(240, 232, 0, 0.5), 0 0 20px rgba(240, 232, 0, 0.3)',
        'cyber-border': 'inset 0 0 0 1px rgba(0, 240, 255, 0.2)',
      },
      animation: {
        'cyber-pulse': 'cyber-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cyber-flicker': 'cyber-flicker 3s linear infinite',
        'cyber-scan': 'cyber-scan 4s linear infinite',
        'cyber-float': 'cyber-float 6s ease-in-out infinite',
        'cyber-glitch': 'cyber-glitch 1s linear infinite',
      },
      keyframes: {
        'cyber-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        'cyber-flicker': {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '0.99' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.4' },
        },
        'cyber-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'cyber-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'cyber-glitch': {
          '0%, 90%, 100%': { transform: 'translate(0)' },
          '92%': { transform: 'translate(-2px, 1px)' },
          '94%': { transform: 'translate(2px, -1px)' },
          '96%': { transform: 'translate(-1px, 2px)' },
          '98%': { transform: 'translate(1px, -2px)' },
        },
      },
    },
  },
  plugins: [],
}
