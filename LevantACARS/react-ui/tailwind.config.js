/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0A192F',
          900: '#0d1f38',
          800: '#112240',
          700: '#1d3461',
        },
        accent: {
          gold: '#C5A059',
          bronze: '#a07d3a',
          cyan: '#22d3ee',
          rose: '#f43f5e',
          emerald: '#2DCE89',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Winky Sans', 'Manrope', 'Sour Gummy', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        display: ['Shadows Into Light Two', 'cursive', 'sans-serif'],
      },
      fontSize: {
        'telemetry-label': ['0.625rem', { lineHeight: '1', letterSpacing: '0.2em', fontWeight: '700' }],
        'telemetry-value': ['1.875rem', { lineHeight: '1', fontWeight: '500' }],
        'telemetry-unit': ['0.625rem', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '600' }],
      },
      animation: {
        'beam': 'beam 8s linear infinite',
        'meteor': 'meteor 4s linear infinite',
        'border-spin': 'border-spin 4s linear infinite',
        'text-reveal': 'text-reveal 0.5s ease forwards',
      },
      keyframes: {
        beam: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: 1 },
          '70%': { opacity: 1 },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: 0 },
        },
        'border-spin': {
          '100%': { transform: 'rotate(360deg)' },
        },
        'text-reveal': {
          '0%': { opacity: 0, filter: 'blur(8px)' },
          '100%': { opacity: 1, filter: 'blur(0px)' },
        },
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
