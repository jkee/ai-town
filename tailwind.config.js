/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      display: ['var(--font-display)', 'sans-serif'],
      body: ['var(--font-body)', 'monospace'],
    },
    extend: {
      colors: {
        brown: {
          100: '#e0e0ff',
          200: '#b8b8d0',
          300: '#8a8aaa',
          500: '#5a5a80',
          700: '#2a2a50',
          800: '#151530',
          900: '#0a0a1a',
        },
        clay: {
          100: '#d0d0ff',
          300: '#8888cc',
          500: '#5555aa',
          700: '#332266',
          900: '#0a0a1a',
        },
        neon: {
          pink: '#ff2d95',
          cyan: '#00f0ff',
          purple: '#b026ff',
          yellow: '#ffe600',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
