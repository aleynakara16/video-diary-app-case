/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#a1d783',
          dark: '#8ec770',
          light: '#eef8e8',
          text: '#142e12',
        },
        background: {
          DEFAULT: '#FAFAFA',
          card: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};

