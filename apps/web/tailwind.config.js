/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50:  'rgb(var(--color-dark-50) / <alpha-value>)',
          100: 'rgb(var(--color-dark-100) / <alpha-value>)',
          200: 'rgb(var(--color-dark-200) / <alpha-value>)',
          300: 'rgb(var(--color-dark-300) / <alpha-value>)',
          400: 'rgb(var(--color-dark-400) / <alpha-value>)',
          500: 'rgb(var(--color-dark-500) / <alpha-value>)',
          600: 'rgb(var(--color-dark-600) / <alpha-value>)',
          700: 'rgb(var(--color-dark-700) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
          950: 'rgb(var(--color-dark-950) / <alpha-value>)',
        },
        primary: {
          50:  '#f0fdfa',
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
        accent: {
          blue: '#3B82F6',
          cyan: '#0891b2',
          green: '#059669',
          orange: '#d97706',
          pink: '#db2777',
          purple: '#7c3aed',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)',
        'gradient-button': 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      },
      boxShadow: {
        'glow': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'glow-lg': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'card': 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
