/**
 * Tailwind is token-aware: every scale below points at the SAME CSS custom
 * properties defined in src/styles/tokens.css, which is the single source of
 * truth ported verbatim from the original project. New/refactored components
 * can therefore use Tailwind utilities (e.g. `text-[color:var(--fg-muted)]`
 * shortened to `text-muted`) without inventing a second palette that could
 * drift from the pixel-perfect original.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-active': 'var(--accent-active)',
        'on-accent': 'var(--on-accent)',
        page: 'var(--bg-page)',
        stage: 'var(--bg-stage)',
        card: 'var(--bg-card)',
        fg: 'var(--fg)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        'fg-faint': 'var(--fg-faint)',
        'fg-disabled': 'var(--fg-disabled)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        success: 'var(--success)',
        neutral: 'var(--neutral)',
        line: 'var(--line)',
      },
      fontFamily: {
        sans: 'var(--font)',
        doc: 'var(--font-doc)',
      },
      fontSize: {
        micro: ['var(--fs-micro)', 'var(--lh-micro)'],
        caption: ['var(--fs-caption)', 'var(--lh-caption)'],
        'body-sm': ['var(--fs-body-sm)', 'var(--lh-body-sm)'],
        body: ['var(--fs-body)', 'var(--lh-body)'],
        title: ['var(--fs-title)', 'var(--lh-title)'],
        display: ['var(--fs-display)', 'var(--lh-display)'],
      },
      borderRadius: {
        '2xs': 'var(--r-2xs)',
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        panel: 'var(--r-panel)',
        full: 'var(--r-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        accent: 'var(--shadow-accent)',
        menu: 'var(--shadow-menu)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
        out: 'var(--ease-out)',
      },
    },
  },
  // The original CSS owns the existing UI verbatim; Tailwind's preflight would
  // fight that reset, so we disable it and rely on base.css's own reset.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
