/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Navy primary — aligned with the design team's exact palette
        // (previously an approximated slate-based scale; now matches
        // the reference implementation's hex values 1:1).
        navy: {
          DEFAULT: '#153a6b',
          50: '#eef3fb',
          100: '#d6e2f4',
          200: '#adc5e9',
          300: '#7fa3da',
          400: '#4e7cc4',
          500: '#2c5aa3',
          600: '#1e4fa1',
          700: '#183f80',
          800: '#153a6b',
          900: '#0e2749',
          950: '#091934',
        },
        // Teal accent — aligned with the design team's exact palette.
        teal: {
          DEFAULT: '#6ac1b8',
          50: '#eefaf8',
          100: '#d3f1ec',
          200: '#a9e2d9',
          300: '#7dd0c3',
          400: '#6ac1b8',
          500: '#48a89d',
          600: '#398a82',
          700: '#2f6f6a',
          800: '#295856',
          900: '#254948',
        },
        cyan: {
          DEFAULT: '#41fdfe',
          50: '#eafffe',
          100: '#c8fffe',
          200: '#a0fdfe',
          300: '#41fdfe',
          400: '#1fe3e5',
          500: '#0dbcbf',
          600: '#0c9598',
          700: '#12777a',
          800: '#175f62',
          900: '#175053',
        },
        ink: {
          DEFAULT: '#101418',
          muted: 'rgba(16,20,24,0.7)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Maintain Plus Jakarta Sans hierarchy for display text
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      maxWidth: {
        container: '1280px',
      },
      boxShadow: {
        // Card shadow for elevated components — aligned with the design
        // team's exact card/card-hover shadow values.
        card: '0 1px 2px rgba(16,20,24,0.04), 0 8px 24px -8px rgba(16,20,24,0.12)',
        'card-hover': '0 4px 8px rgba(16,20,24,0.06), 0 16px 32px -12px rgba(16,20,24,0.18)',
        'card-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        'container': '1.25rem',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
