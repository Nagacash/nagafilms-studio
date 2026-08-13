/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0a0812',
        'panel-bg': '#12101a',
        'card-bg': '#1a1524',
        'neon-pink': '#ff6ec7',
        'neon-cyan': '#00d4ff',
        primary: '#00ff88',
        secondary: '#a1a1aa',
        muted: '#52525b',
      },
    },
  },
  plugins: [],
}
