/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F5F2',
        sidebar: '#ECEAE7',
        card: '#FFFFFF',
        'primary-dark': '#102326',
        'primary-hover': '#0b191c',
        'accent-orange': '#C96A32',
        'border-subtle': '#D7D3CF',
        'text-primary': '#111111',
        'text-secondary': '#666666',
        'text-muted': '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Courier New', 'monospace'],
        heading: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        subtle: '0 1px 2px rgba(0,0,0,0.03)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

