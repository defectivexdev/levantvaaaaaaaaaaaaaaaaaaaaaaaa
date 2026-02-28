import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyAuth } from '@/lib/auth';

// POST /api/cdn/upload — Upload a file to Vercel Blob storage
// Requires authentication. Supports liveries, ACARS installers, etc.
export async function POST(request: NextRequest) {
    try {
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file size (50MB max for Vercel Blob)
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
        }

        const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const blob = await put(filename, file, {
            access: 'public',
            addRandomSuffix: false,
        });

        return NextResponse.json({
            success: true,
            url: blob.url,
            pathname: blob.pathname,
            size: file.size,
        });
    } catch (error: any) {
        console.error('CDN Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
    }
}
