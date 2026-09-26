/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          dark: '#0b0f19',
          card: '#111827',
          border: '#1f2937',
          accent: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}