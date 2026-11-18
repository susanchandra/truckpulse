/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#0a0c10',
          900: '#0e1117',
          850: '#141820',
          800: '#1a1f2c',
          750: '#212738',
          700: '#2b3348',
          600: '#3c4660',
        },
        panel: {
          bg: '#12161f',
          header: '#171c26',
          border: '#222838',
          hover: '#1a202c',
        },
        accent: {
          lime: '#a3e635', // Electric lime
          'lime-dim': 'rgba(163, 230, 53, 0.15)',
          amber: '#f59e0b',
          'amber-dim': 'rgba(245, 158, 11, 0.15)',
          red: '#ef4444',
          'red-dim': 'rgba(239, 68, 68, 0.15)',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
