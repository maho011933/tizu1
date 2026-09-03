/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          low: '#34d399',    // Green
          medium: '#fbbf24', // Yellow
          high: '#f87171',   // Red
          extreme: '#7f1d1d', // Dark Red
        }
      }
    },
  },
  plugins: [],
}
