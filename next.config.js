/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compress: true,
    poweredByHeader: false,
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 3600,
        deviceSizes: [640, 828, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        },
        proxyClientMaxBodySize: '500mb',
        optimizePackageImports: [
            'lucide-react',
            'framer-motion',
            'motion',
            'sonner',
            'recharts',
            'date-fns',
            '@tabler/icons-react',
        ],
        optimizeCss: true,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, max-age=0' },
                ],
            },
            {
                source: '/img/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/fonts/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
        ];
    },
}

module.exports = nextConfig
