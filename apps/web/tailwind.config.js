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
        // Dark blue theme colors (matching Voicer style)
        dark: {
          50: '#E8EDF5',
          100: '#C5D1E8',
          200: '#9FB3D9',
          300: '#7895CA',
          400: '#5A7FBE',
          500: '#3D69B2',
          600: '#2D5494',
          700: '#1E3F76',
          800: '#142B58',
          900: '#0A1628',
          950: '#060D17',
        },
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        accent: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          green: '#10B981',
          orange: '#F59E0B',
          pink: '#EC4899',
          purple: '#8B5CF6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
        'gradient-button': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
