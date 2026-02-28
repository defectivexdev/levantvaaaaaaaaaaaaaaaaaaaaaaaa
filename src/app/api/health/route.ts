import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    const checks: Record<string, boolean | string> = {
        MONGODB_URI: !!process.env.MONGODB_URI,
        JWT_SECRET: !!process.env.JWT_SECRET,
        BASE_URL: !!process.env.BASE_URL,
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        SMTP_HOST: !!process.env.SMTP_HOST,
        NODE_ENV: process.env.NODE_ENV || 'unknown',
    };

    let dbConnected = false;
    try {
        await connectDB();
        dbConnected = true;
    } catch (e: any) {
        checks.DB_ERROR = e.message;
    }

    checks.DB_CONNECTED = dbConnected;

    return NextResponse.json({
        status: dbConnected ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString()
    });
}
