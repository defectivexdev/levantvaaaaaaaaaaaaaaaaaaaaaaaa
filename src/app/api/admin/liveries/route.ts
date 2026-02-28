import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const GITHUB_REPO = process.env.GITHUB_LIVERIES_REPO || 'bunnyyxdev/levant-va-main-webbbbbbbbbbbbbbbbbbbbb';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const LIVERIES_PATH = 'liveries';

function githubHeaders() {
    const h: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Levant-VA-Web',
    };
    if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    return h;
}

// GET - List all liveries from GitHub repo
export async function GET() {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${LIVERIES_PATH}`,
            { headers: githubHeaders(), cache: 'no-store' }
        );

        if (!res.ok) {
            if (res.status === 404) return NextResponse.json({ success: true, liveries: [] });
            throw new Error(`GitHub API returned ${res.status}`);
        }

        const files = await res.json();
        if (!Array.isArray(files)) return NextResponse.json({ success: true, liveries: [] });

        const liveries = files
            .filter((f: any) => f.type === 'file' && f.name.toLowerCase().endsWith('.zip'))
            .map((f: any) => ({
                filename: f.name,
                size: f.size,
                sha: f.sha,
                download_url: f.download_url,
            }));

        return NextResponse.json({ success: true, liveries });
    } catch (error: any) {
        console.error('Admin liveries GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Upload a ZIP file to the GitHub repo /liveries folder
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    if (!GITHUB_TOKEN) {
        return NextResponse.json({ error: 'GITHUB_TOKEN is not configured on the server' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const filename = formData.get('filename') as string;

        if (!file || !filename) {
            return NextResponse.json({ error: 'File and filename are required' }, { status: 400 });
        }

        const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9_]/g, '') + '.zip';

        const bytes = await file.arrayBuffer();
        const base64Content = Buffer.from(bytes).toString('base64');

        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${LIVERIES_PATH}/${cleanFilename}`,
            {
                method: 'PUT',
                headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Add livery: ${cleanFilename}`,
                    content: base64Content,
                }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API returned ${res.status}`);
        }

        const data = await res.json();

        return NextResponse.json({
            success: true,
            livery: {
                filename: cleanFilename,
                size: file.size,
                sha: data.content?.sha,
                download_url: data.content?.download_url,
            },
        });
    } catch (error: any) {
        console.error('Admin liveries POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove a livery file from the GitHub repo
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    if (!GITHUB_TOKEN) {
        return NextResponse.json({ error: 'GITHUB_TOKEN is not configured on the server' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const sha = searchParams.get('sha');

        if (!filename || !sha) {
            return NextResponse.json({ error: 'Filename and sha are required' }, { status: 400 });
        }

        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${LIVERIES_PATH}/${filename}`,
            {
                method: 'DELETE',
                headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Remove livery: ${filename}`,
                    sha,
                }),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API returned ${res.status}`);
        }

        return NextResponse.json({ success: true, message: `Livery "${filename}" deleted` });
    } catch (error: any) {
        console.error('Admin liveries DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
