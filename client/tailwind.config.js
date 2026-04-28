/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        unicri: {
          // Acento principal FluxD — teal profissional (substitui o laranja)
          orange: '#1A8DB5',
          'orange-light': '#2BA8D4',
          'orange-dark': '#1279A0',
          navy: '#1E3A5F',
          'navy-light': '#2D5086',
          'navy-dark': '#142940',
          // Cream agora tem toque teal ao invés de laranja
          cream: '#EFF8FC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
