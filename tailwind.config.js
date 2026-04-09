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
        navalBlue: '#001838', // Primary color (much darker naval blue)
        navyDark: '#011c47', // Deep navy for dark backgrounds (replacing black)
        navyLight: '#1a6ce6', // Lighter naval blue for accents
        adminBlue: '#00040C', // Even darker blue requested for Admin Panel
        pullmanBrown: '#3a2410', // Secondary color
        darkGray: '#1a1a1a', // Replaces black
      },
    },
  },
  plugins: [],
};
