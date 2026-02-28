import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || ""
});

async function isAdmin(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('lva_session')?.value;
    if (!token) return false;

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secret);
        return payload.isAdmin === true || payload.role === 'Admin';
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;
        const name = formData.get('name') as string;

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const cleanName = (name || 'item').toLowerCase().replace(/[^a-z0-9]/g, '_');

        const result: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: `store/${type}`,
                    public_id: `${cleanName}_${timestamp}`,
                    resource_type: type === 'zip' ? 'raw' : 'image',
                    overwrite: true,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        return NextResponse.json({
            url: result.secure_url,
            message: 'File uploaded successfully'
        });
    } catch (error: any) {
        console.error('Store upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
