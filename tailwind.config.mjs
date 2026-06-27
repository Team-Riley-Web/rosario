/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'oklch(13% 0.010 255 / <alpha-value>)',
          mid: 'oklch(30% 0.008 255 / <alpha-value>)',
          soft: 'oklch(50% 0.006 255 / <alpha-value>)',
        },
        parchment: {
          DEFAULT: 'oklch(97.5% 0.008 75 / <alpha-value>)',
          2: 'oklch(95% 0.012 72 / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'oklch(64% 0.115 72 / <alpha-value>)',
          light: 'oklch(80% 0.08 78 / <alpha-value>)',
          deep: 'oklch(52% 0.10 68 / <alpha-value>)',
        },
        brand: {
          'dark-blue': '#061e3b',
        },
        white: 'oklch(99.5% 0.003 75 / <alpha-value>)',
        rule: 'oklch(88% 0.006 72 / <alpha-value>)',
      },
      fontFamily: {
        display: ['DesirePro', 'Georgia', 'serif'],
        sans: ['FoundersGrotesk', 'system-ui', 'sans-serif'],
        mono: ['FoundersGrotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.04)',
        'lift':   '0 4px 8px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.07)',
        'strong': '0 8px 16px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};
