/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
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
          0: '#ffffff',
          1: '#f8f9fc',
          2: '#f1f3f9',
          3: '#e8ecf4',
          4: '#dde2ed',
        },
        ink: {
          0: '#0f1729',
          1: '#2b3a5c',
          2: '#556889',
          3: '#8494b2',
          4: '#a8b5cc',
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
      }
    },
  },
  plugins: [],
};
