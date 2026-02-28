import { NextResponse } from 'next/server';

const GITHUB_REPO = process.env.GITHUB_REPO || 'bunnyyxdev/levant-va-main-webbbbbbbbbbbbbbbbbbbbb';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Force dynamic so the route is never statically cached at build time
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Levant-VA-Web',
        };

        if (GITHUB_TOKEN) {
            headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
        }

        // Always fetch fresh from GitHub (no caching) so download page stays in sync
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
            { headers, cache: 'no-store' }
        );

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ release: null, message: 'No releases found' });
            }
            if (res.status === 401 || res.status === 403) {
                console.error(`GitHub API auth error (${res.status}) - check GITHUB_TOKEN`);
                // Retry without token (public repos work without auth)
                const publicRes = await fetch(
                    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
                    { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Levant-VA-Web' }, cache: 'no-store' }
                );
                if (!publicRes.ok) {
                    throw new Error(`GitHub API returned ${publicRes.status} (token and public fallback both failed)`);
                }
                const release = await publicRes.json();
                return buildReleaseResponse(release);
            }
            throw new Error(`GitHub API returned ${res.status}`);
        }

        const release = await res.json();
        return buildReleaseResponse(release);
    } catch (error: any) {
        console.error('GitHub Release API error:', error);
        return NextResponse.json(
            { release: null, error: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}

function buildReleaseResponse(release: any) {
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const setupAsset = release.assets?.find((a: any) => a.name.endsWith('-Setup.exe') || a.name.endsWith('.msi'));
    const zipAsset = release.assets?.find((a: any) => a.name.endsWith('.zip'));

    return NextResponse.json({
        release: {
            version: release.tag_name?.replace(/^v/, '') || release.name,
            tag: release.tag_name,
            name: release.name,
            body: release.body,
            published_at: release.published_at,
            html_url: release.html_url,
            msi: setupAsset ? {
                name: setupAsset.name,
                size: formatBytes(setupAsset.size),
                download_url: setupAsset.browser_download_url,
                download_count: setupAsset.download_count,
            } : null,
            zip: zipAsset ? {
                name: zipAsset.name,
                size: formatBytes(zipAsset.size),
                download_url: zipAsset.browser_download_url,
                download_count: zipAsset.download_count,
            } : null,
            total_downloads: release.assets?.reduce((sum: number, a: any) => sum + (a.download_count || 0), 0) || 0,
        }
    });
}
