/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#E46B45",
        "primary-dark": "#C85A38",
        secondary: "#FFC844",
        accent: "#388E3C",
        background: "#F8F5F2",
        text: "#333333",
      },
    },
  },
  plugins: [],
};
