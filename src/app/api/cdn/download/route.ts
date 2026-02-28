import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

const GITHUB_REPO = process.env.GITHUB_LIVERIES_REPO || 'bunnyyxdev/levant-va-main-webbbbbbbbbbbbbbbbbbbbb';
const LIVERIES_PATH = 'liveries';

export async function GET(request: NextRequest) {
    try {
        const type = request.nextUrl.searchParams.get('type');
        const file = request.nextUrl.searchParams.get('file');

        // Livery download — redirect to GitHub raw URL
        if (type === 'livery' && file) {
            const cleanFile = file.replace(/[^a-zA-Z0-9._-]/g, '');
            const githubUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${LIVERIES_PATH}/${cleanFile}`;
            return NextResponse.redirect(githubUrl, 302);
        }

        // Vercel Blob download — redirect to blob URL
        const path = request.nextUrl.searchParams.get('path');
        if (path) {
            const { blobs } = await list({ prefix: path, limit: 1 });
            if (blobs.length === 0) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            return NextResponse.redirect(blobs[0].url);
        }

        // List files in a folder
        const folder = request.nextUrl.searchParams.get('folder') || '';
        const { blobs } = await list({ prefix: folder, limit: 100 });

        return NextResponse.json({
            success: true,
            files: blobs.map(b => ({
                url: b.url,
                pathname: b.pathname,
                size: b.size,
                uploadedAt: b.uploadedAt,
            })),
        });
    } catch (error: any) {
        console.error('CDN Download Error:', error);
        return NextResponse.json({ error: 'Failed to list files', details: error.message }, { status: 500 });
    }
}
