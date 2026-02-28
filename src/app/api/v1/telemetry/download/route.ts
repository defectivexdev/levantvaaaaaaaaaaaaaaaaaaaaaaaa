import { NextRequest, NextResponse } from 'next/server';
import { VersionSummary } from '@/models/VersionSummary';
import { DownloadLog } from '@/models/DownloadLog';
import connectDB from '@/lib/database';

const API_KEY = 'LEVANT-SECRET-KEY-2026';

export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (apiKey !== API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { version, platform } = await req.json();

        // 1. Detailed Log
        await DownloadLog.create({
            version,
            platform: platform || 'Windows',
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
        });

        // 2. Increment Summary counter
        await VersionSummary.findOneAndUpdate(
            { version },
            { 
                $inc: { total_downloads: 1 },
                $set: { last_download_at: new Date() }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Telemetry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
