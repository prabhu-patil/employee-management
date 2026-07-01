/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f1117',
          surface: '#1a1d27',
          card: '#21253a',
          border: '#2d3150',
          accent: '#6366f1',
          'accent-light': '#818cf8',
          'text-muted': '#8b8fa8',
        },
      },
    },
  },
  plugins: [],
};
