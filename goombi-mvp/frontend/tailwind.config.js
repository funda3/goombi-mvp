/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 55px rgba(9, 28, 35, 0.18)",
      },
    },
  },
  plugins: [],
};
