/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Desktop theme (cyber)
        cyber: {
          dark: '#020617',
          slate: '#0f172a',
          emerald: '#10b981', // Healthy
          cyan: '#06b6d4',    // Watering
          amber: '#f59e0b',   // Warning
          rose: '#f43f5e',    // Critical
        },
        // Mobile theme (nature-inspired green)
        mobile: {
          primary: '#13ec37',
          'bg-light': '#f6f8f6',
          'bg-dark': '#102213',
          'surface-light': '#ffffff',
          'surface-dark': '#1a2e1d',
          'card-dark': '#1c271d',
          'text-muted': '#9db9a1',
          'border-dark': '#2a382b',
        }
      },
      fontFamily: {
        'manrope': ['Manrope', 'sans-serif'],
        'display': ['Manrope', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(to bottom right, #020617, #0f172a)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
