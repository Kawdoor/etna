/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        futuristic: ['"Lexend Exa"', "sans-serif"],
      },
      animation: {
        gradient: "gradient 15s ease infinite",
      },
      keyframes: {
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      colors: {
        navalBlue: '#001F3F', // Primary color
        pullmanBrown: '#644117', // Secondary color
      },
    },
  },
  plugins: [],
};
