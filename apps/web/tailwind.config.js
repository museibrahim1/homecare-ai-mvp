/** @type {import('tailwindcss').Config} */

// Helper to create a color that references a CSS variable with alpha support
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors via CSS variables
        dark: {
          50:  withOpacity('--color-dark-50'),
          100: withOpacity('--color-dark-100'),
          200: withOpacity('--color-dark-200'),
          300: withOpacity('--color-dark-300'),
          400: withOpacity('--color-dark-400'),
          500: withOpacity('--color-dark-500'),
          600: withOpacity('--color-dark-600'),
          700: withOpacity('--color-dark-700'),
          800: withOpacity('--color-dark-800'),
          900: withOpacity('--color-dark-900'),
          950: withOpacity('--color-dark-950'),
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
        'card': 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
