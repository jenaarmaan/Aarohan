/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0a0a0f",
        darkCard: "#12121e",
        glassBg: "rgba(18, 18, 30, 0.6)",
        accentColor: "#6366f1", // Indigo
      },
    },
  },
  plugins: [],
}
