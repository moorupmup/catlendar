/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cat: {
          50: '#FFF5F7',
          100: '#FFE6EC',
          200: '#FFCCD8',
          300: '#FF9EBA',
          400: '#FF7096',
          500: '#FF477E',
          600: '#E02660',
          700: '#B81446',
          800: '#911037',
          900: '#75102F',
        },
        cream: {
          50: '#FFFAF7',
          100: '#FFF4EE',
          200: '#FFE7DA',
        },
        // Cute pastel badge colors for pets
        pet: {
          peach: '#FFD6A5',
          lavender: '#D8B4F8',
          mint: '#B7E4C7',
          sky: '#A0C4FF',
          butter: '#FDFFB6',
          rose: '#FFADAD',
          coral: '#FFB5A7',
          lilac: '#FCD5CE',
          pistachio: '#C7F9CC',
          periwinkle: '#CDB4DB',
        }
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'cute': '0 4px 20px -2px rgba(255, 112, 150, 0.15)',
        'cute-lg': '0 10px 25px -3px rgba(255, 112, 150, 0.22)',
        'cute-inner': 'inset 0 2px 4px 0 rgba(255, 112, 150, 0.08)',
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      }
    },
  },
  plugins: [],
}
