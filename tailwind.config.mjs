/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'oklch(from var(--light-fg) l c h / <alpha-value>)',
          mid: 'oklch(30% 0.008 255 / <alpha-value>)',
          soft: 'oklch(from var(--light-sub) l c h / <alpha-value>)',
        },
        parchment: {
          DEFAULT: 'oklch(from var(--light-bg) l c h / <alpha-value>)',
          2: 'oklch(from var(--light-surface) l c h / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'oklch(from var(--accent) l c h / <alpha-value>)',
          light: 'oklch(from var(--accent-light) l c h / <alpha-value>)',
          deep: 'oklch(from var(--accent-deep) l c h / <alpha-value>)',
        },
        brand: {
          'dark-blue': 'oklch(from var(--cobalt) l c h / <alpha-value>)',
        },
        white: 'oklch(from var(--fg) l c h / <alpha-value>)',
        rule: 'oklch(from var(--light-border) l c h / <alpha-value>)',
      },
      fontFamily: {
        display: ['DesirePro', 'Georgia', 'serif'],
        sans: ['FoundersGrotesk', 'system-ui', 'sans-serif'],
        label: ['FoundersGrotesk', 'system-ui', 'sans-serif'],
        mono: ['FoundersGrotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sharp: 'var(--radius-sharp)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
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
