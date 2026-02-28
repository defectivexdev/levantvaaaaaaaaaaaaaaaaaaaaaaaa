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

export async function POST(request: NextRequest) {
    const authenticatedPilotId = await getAuthenticatedPilotId(request);
    if (!authenticatedPilotId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Use the API secret to sign the parameters
        // Include overwrite and invalidate to allow replacing existing images
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: 'avatars',
                public_id: `pilot_${authenticatedPilotId}`,
                overwrite: true,
                invalidate: true
            },
            process.env.CLOUDINARY_API_SECRET || ""
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
            apiKey: process.env.CLOUDINARY_API_KEY || "",
            folder: 'avatars',
            publicId: `pilot_${authenticatedPilotId}`,
            overwrite: true,
            invalidate: true
        });
    } catch (error: any) {
        console.error('Cloudinary signing error:', error);
        return NextResponse.json({ error: 'Failed to generate signature' }, { status: 500 });
    }
}
