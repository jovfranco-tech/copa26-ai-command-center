/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--bg-2)',
        line: 'var(--line)',
        tx: 'var(--tx)',
        tx2: 'var(--tx-2)',
        tx3: 'var(--tx-3)',
        gold: 'var(--gold)',
        live: 'var(--live)',
        pos: 'var(--pos)',
        neg: 'var(--neg)',
        warn: 'var(--warn)',
      },
      borderRadius: {
        card: 'var(--r)',
        smx: 'var(--r-sm)',
      },
      fontFamily: {
        ui: 'var(--font-ui)',
        num: 'var(--font-num)',
      },
    },
  },
  plugins: [],
};
