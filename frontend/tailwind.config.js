/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          bright: 'rgb(var(--primary-bright) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          light: 'rgb(var(--primary-light) / <alpha-value>)',
        },
        indigo: {
          deep: 'rgb(var(--indigo-deep) / <alpha-value>)',
          sidebar: 'rgb(var(--sidebar-indigo) / <alpha-value>)',
        },
        lavender: {
          DEFAULT: 'rgb(var(--lavender) / <alpha-value>)',
          light: 'rgb(var(--lavender) / <alpha-value>)',
        },
        surface: {
          page: 'rgb(var(--page-bg) / <alpha-value>)',
          card: 'rgb(var(--card-bg) / <alpha-value>)',
          border: 'rgb(var(--border-color) / <alpha-value>)',
        },
        content: {
          main: 'rgb(var(--text-main) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        status: {
          success: 'rgb(var(--status-success) / <alpha-value>)',
          warning: 'rgb(var(--status-warning) / <alpha-value>)',
          critical: 'rgb(var(--status-critical) / <alpha-value>)',
        }
      },
      borderRadius: {
        'card': 'var(--radius-card, 12px)',
        'input': 'var(--radius-input, 8px)',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      transitionDuration: {
        DEFAULT: '200ms',
        'fast': '150ms',
        'normal': '200ms',
        'smooth': '250ms',
      }
    },
  },
  plugins: [],
}
