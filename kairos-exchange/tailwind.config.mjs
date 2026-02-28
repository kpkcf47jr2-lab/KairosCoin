/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8E8',
          100: '#FAF0CC',
          200: '#F5E199',
          300: '#EFD166',
          400: '#D4AF37',
          500: '#D4AF37',
          600: '#B8962E',
          700: '#9A7D25',
          800: '#7C641D',
          900: '#5E4B15',
        },
        dark: {
          50: '#1A1D26',
          100: '#151821',
          200: '#10131B',
          300: '#0B0E15',
          400: '#080A11',
          500: '#05070D',
          600: '#030509',
          700: '#020306',
          800: '#010204',
          900: '#000102',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(212,175,55,0.2)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
