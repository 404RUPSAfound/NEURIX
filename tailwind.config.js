/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        primary: '#00D4FF',
        danger: '#FF3B3B',
        surface: '#1A1A1A',
        surfaceLight: '#2A2A2A',
        text: '#FFFFFF',
        textMuted: '#A0A0A0',
      }
    },
  },
  plugins: [],
}