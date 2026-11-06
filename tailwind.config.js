/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#7C3AED",
          navy: "#1E1B4B",
          amber: "#F59E0B",
        }
      }
    },
  },
  plugins: [],
}