/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#173042', slate: '#5d7480', mist: '#f4f8f7', mint: '#dff3e9', teal: '#16877d', coral: '#ef725f', amber: '#e5a83b' },
      fontFamily: { display: ['Manrope', 'sans-serif'], sans: ['DM Sans', 'sans-serif'] },
    },
  },
  plugins: [],
}

