/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#020617',
          slate: '#0f172a',
          emerald: '#10b981', // Healthy
          cyan: '#06b6d4',    // Watering
          amber: '#f59e0b',   // Warning
          rose: '#f43f5e',    // Critical
        }
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(to bottom right, #020617, #0f172a)',
      }
    },
  },
  plugins: [],
}
