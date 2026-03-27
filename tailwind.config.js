/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        ink: {
          0: 'var(--ink-0)',
          1: 'var(--ink-1)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        accent: {
          green: '#12b886',
          amber: '#f59f00',
          red: '#fa5252',
          teal: '#15aabf',
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 41, 0.04), 0 4px 12px rgba(15, 23, 41, 0.06)',
        'card-hover': '0 2px 8px rgba(15, 23, 41, 0.06), 0 8px 24px rgba(15, 23, 41, 0.1)',
        'panel': '0 0 0 1px rgba(15, 23, 41, 0.06), 0 2px 6px rgba(15, 23, 41, 0.04)',
        'glass': '0 8px 32px rgba(15, 23, 41, 0.08)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      keyframes: {
        'scan-line': {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'page-split': {
          '0%': { transform: 'translateX(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateX(30px) rotate(3deg)', opacity: '0.7' },
        },
        'page-stack': {
          '0%': { transform: 'translateY(-10px)', opacity: '0.5' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite alternate',
        'slide-up-fade': 'slide-up-fade 0.35s ease-out forwards',
        'page-split': 'page-split 0.6s ease-out forwards',
        'page-stack': 'page-stack 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
