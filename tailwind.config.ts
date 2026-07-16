import type { Config } from 'tailwindcss'

// Tokens vindos de branding/design-tokens.json (Etapa 1).
// Ao mudar a paleta/fontes lá, reflita aqui e na skill creden-design.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E5C56',
          hover: '#0B4A45',
          light: '#3BA89E',
        },
        secondary: '#16302E',
        accent: {
          DEFAULT: '#F5B14C',
          hover: '#E89F32',
        },
        success: { DEFAULT: '#1F9D6B', bg: '#E4F5EC' },
        error: { DEFAULT: '#D14343', bg: '#FBE7E7' },
        warning: { DEFAULT: '#E0A300', bg: '#FCF3DA' },
        ink: '#1C1B18',
        muted: '#6B675E',
        line: '#E4DFD4',
        // Warm × Natural: superfície creme quente (não branco puro).
        surface: '#FBF8F1',
        sand: '#F4F1EA',
        // status badges
        status: {
          inscrito: '#0E5C56',
          'inscrito-bg': '#E2EFEE',
          presente: '#1F9D6B',
          'presente-bg': '#E4F5EC',
          cancelado: '#8A8377',
          'cancelado-bg': '#EFECE4',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Warm × Natural: cantos mais arredondados, orgânicos.
        md: '14px',
        lg: '22px',
        xl: '26px',
        pill: '999px',
      },
      boxShadow: {
        // Sombras tingidas de verde (não cinza neutro).
        card: '0 1px 2px rgba(14,92,86,.05), 0 16px 44px rgba(14,92,86,.10)',
        lift: '0 22px 50px rgba(14,92,86,.16)',
      },
    },
  },
  plugins: [],
}

export default config
