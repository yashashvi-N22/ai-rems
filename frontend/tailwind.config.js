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
        rems: {
          bg: '#0B0F19',
          card: '#111827',
          cardHover: '#1E293B',
          border: '#1F2937',
          solar: '#F59E0B',
          wind: '#06B6D4',
          battery: '#10B981',
          demand: '#EC4899',
          grid: '#8B5CF6',
          accent: '#3B82F6'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-solar': 'flow 1.5s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
