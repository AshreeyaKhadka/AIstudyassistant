/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-lowest': 'var(--surface-container-lowest)',
        'surface-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-high': 'var(--surface-container-high)',
        'surface-highest': 'var(--surface-container-highest)',
        primary: 'var(--primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary': 'var(--on-primary)',
        secondary: 'var(--secondary-container)',
        'on-secondary': 'var(--on-secondary-container)',
        tertiary: 'var(--tertiary)',
        'outline-variant': 'var(--outline-variant)',
        'ghost-border': 'var(--ghost-border)',
      },
      fontFamily: {
        editorial: ['var(--font-editorial)', 'sans-serif'],
        functional: ['var(--font-functional)', 'sans-serif'],
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-default)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      }
    },
  },
  plugins: [],
}
