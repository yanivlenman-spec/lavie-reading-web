/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fredoka', 'Heebo', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#6c63ff',
        'primary-light': '#8b85ff',
        secondary: '#ff6b9d',
        accent: '#ffd93d',
        success: '#6bcb77',
        bg: '#fff8f0',
        text: '#2d3436',
        'text-light': '#636e72',
      },
    },
  },
}
