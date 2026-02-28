import { NextResponse } from 'next/server';

const GITHUB_REPO = process.env.GITHUB_LIVERIES_REPO || 'bunnyyxdev/levant-va-main-webbbbbbbbbbbbbbbbbbbbb';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const LIVERIES_PATH = 'liveries';

export const dynamic = 'force-dynamic';

function parseLiveryFilename(filename: string) {
    // e.g. fenix_a320_levant_msfs.zip → { name: "Fenix A320 Levant", simulator: "MSFS", raw: "fenix_a320_levant_msfs" }
    const raw = filename.replace(/\.zip$/i, '');
    const parts = raw.split('_');
    if (parts.length < 2) return { name: raw, simulator: 'Other', raw };
    const simulator = parts[parts.length - 1].toUpperCase();
    const nameParts = parts.slice(0, -1);
    const name = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return { name, simulator: simulator === 'XPLANE' ? 'X-Plane' : simulator, raw };
}

export async function GET() {
    try {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Levant-VA-Web',
        };
        if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${LIVERIES_PATH}`,
            { headers, cache: 'no-store' }
        );

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ success: true, liveries: [] });
            }
            throw new Error(`GitHub API returned ${res.status}`);
        }

        const files = await res.json();
        if (!Array.isArray(files)) {
            return NextResponse.json({ success: true, liveries: [] });
        }

        const liveries = files
            .filter((f: any) => f.type === 'file' && f.name.toLowerCase().endsWith('.zip'))
            .map((f: any) => {
                const parsed = parseLiveryFilename(f.name);
                return {
                    name: parsed.name,
                    simulator: parsed.simulator,
                    filename: f.name,
                    download_url: f.download_url,
                    size: f.size,
                    sha: f.sha,
                };
            });

        return NextResponse.json({ success: true, liveries });
    } catch (error: any) {
        console.error('Liveries GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
