/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.{html,js}",
    "./static/js/*.js"
  ],
  safelist: [
    'text-green-500',
    'text-red-500',
  ],
  theme: {
    extend: {
      fontFamily: {
        pressStart: ['"PressStart2P"', "sans-serif"]
      }
    },
  },
  plugins: [],
}

