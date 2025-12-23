/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#5d2c75",
          lightPurple: "#f3e5f5",
          green: "#8cc63f",
          cream: "#fff9e5",
          brown: "#d99a58",
          darkText: "#2d1b36",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};