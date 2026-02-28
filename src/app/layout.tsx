import type { Metadata } from 'next';
import { Shadows_Into_Light_Two, Manrope, Sour_Gummy } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import SecurityProtector from '@/components/SecurityProtector';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';

const winkySans = localFont({
    src: [
        {
            path: '../fonts/WinkySans-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../fonts/WinkySans-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../fonts/WinkySans-SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../fonts/WinkySans-Bold.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../fonts/WinkySans-ExtraBold.ttf',
            weight: '800',
            style: 'normal',
        },
        {
            path: '../fonts/WinkySans-Black.ttf',
            weight: '900',
            style: 'normal',
        },
    ],
    variable: '--font-winky',
    fallback: ['system-ui', 'sans-serif'],
});

const manrope = Manrope({
    subsets: ['latin'],
    variable: '--font-manrope',
});

const sourGummy = Sour_Gummy({
    subsets: ['latin'],
    variable: '--font-sour-gummy',
});

const shadowsIntoLight = Shadows_Into_Light_Two({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-shadows',
});

export const metadata: Metadata = {
    title: 'Levant Virtual Airline | The Inspiration of Middle East',
    description: 'Experience the leading virtual airline of the Middle East. Join our advanced flight operations and supportive community.',
    keywords: ['virtual airline', 'flight simulator', 'Middle East', 'aviation', 'VATSIM'],
    icons: {
        icon: [
            { url: '/img/logo.ico', sizes: '16x16 32x32 48x48' },
            { url: '/img/logo-256.png', sizes: '256x256', type: 'image/png' },
        ],
        apple: '/img/logo-256.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${winkySans.variable} ${manrope.variable} ${sourGummy.variable} ${shadowsIntoLight.variable}`} data-scroll-behavior="smooth">
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </head>
            <body className="antialiased">
                {/* <SecurityProtector /> */}
                <AuthProvider>
                    {children}
                </AuthProvider>
                <Toaster position="top-right" richColors theme="dark" />
            </body>
        </html>
    );
}
