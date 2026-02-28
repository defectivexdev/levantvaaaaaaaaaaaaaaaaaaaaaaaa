/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                accent: {
                    gold: '#D4AF37',
                    bronze: '#CD7F32',
                },
                dark: {
                    900: '#0a0a0a',
                    800: '#121212',
                    700: '#1a1a1a',
                    600: '#242424',
                    500: '#2d2d2d',
                }
            },
            fontFamily: {
                sans: ['var(--font-winky)', 'var(--font-manrope)', 'Sour Gummy', 'system-ui', 'sans-serif'],
                display: ['var(--font-shadows)', 'cursive', 'sans-serif'],
                manrope: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            rotate: {
                '120': '120deg',
                '240': '240deg',
            },
        },
    },
    plugins: [],
}
