import { NextRequest, NextResponse } from 'next/server';
import { DownloadLog } from '@/models/DownloadLog';
import connectDB from '@/lib/database';

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { version, platform } = await req.json();
        
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const ua = req.headers.get('user-agent') || 'unknown';

        await DownloadLog.create({
            file_name: `Levant-ACARS-v${version || 'unknown'}.msi`,
            ip_address: ip,
            user_agent: ua,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Download tracking error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
