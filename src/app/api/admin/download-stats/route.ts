import { NextResponse } from 'next/server';
import { DownloadLog } from '@/models/DownloadLog';
import connectDB from '@/lib/database';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function GET() {
    try {
        // Auth check (basic check for admin session)
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.role !== 'admin' && payload.email !== 'admin@levant-va.com') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectDB();
        
        const stats = await DownloadLog.aggregate([
            {
                $group: {
                    _id: "$version",
                    totalDownloads: { $sum: 1 },
                    lastDownload: { $max: "$downloadedAt" }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
