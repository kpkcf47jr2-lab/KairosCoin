/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kairos: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f7c948',
          500: '#D4AF37',
          600: '#b8960f',
          700: '#926c05',
          800: '#6b4f04',
          900: '#4a3703',
        },
        dark: {
          50: '#1a1a2e',
          100: '#141420',
          200: '#0f0f1a',
          300: '#0a0a14',
          400: '#05050f',
          500: '#030308',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
