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
      keyframes: {
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0)", opacity: "1" },
          "100%": {
            transform: "translateY(20px) rotate(180deg)",
            opacity: "0",
          },
        },
      },
      animation: {
        "pulse-scale": "pulse-scale 0.6s ease-in-out",
        "slide-up-fade": "slide-up-fade 0.4s ease-out",
        "bounce-in": "bounce-in 0.5s ease-out",
        confetti: "confetti 1s ease-out forwards",
      },
    },
  },
  plugins: [],
};
