/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        palm: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#042f2e',
        },
        dark: {
          50: '#e8edf5',
          100: '#c5d1e8',
          200: '#9fb3d9',
          300: '#7895ca',
          400: '#829bcd',
          500: '#3d69b2',
          600: '#2d5494',
          700: '#1e3f76',
          800: '#142b58',
          900: '#0a1628',
          950: '#060d17',
        },
      },
    },
  },
  plugins: [],
};
