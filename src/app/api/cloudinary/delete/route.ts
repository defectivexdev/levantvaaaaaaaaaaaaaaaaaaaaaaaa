import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || ""
});

async function getAuthenticatedPilotId(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('lva_session')?.value;
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secret);
        return payload.pilotId as string;
    } catch {
        return null;
    }
}

export async function DELETE(request: NextRequest) {
    const authenticatedPilotId = await getAuthenticatedPilotId(request);
    if (!authenticatedPilotId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const publicId = `avatars/pilot_${authenticatedPilotId}`;
        
        // Delete the image from Cloudinary with CDN invalidation
        const result = await cloudinary.uploader.destroy(publicId, {
            invalidate: true  // Purge from CDN cache
        });
        console.log('[Cloudinary Delete] Result:', result);

        return NextResponse.json({ 
            message: 'Avatar deleted successfully', 
            result 
        });
    } catch (error: any) {
        console.error('Cloudinary delete error:', error);
        return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }
}
