/** @type {import('tailwindcss').Config} */
export default {
  important: true, // Добавляет !important ко всем стилям для лучшего рендеринга в html2canvas
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}