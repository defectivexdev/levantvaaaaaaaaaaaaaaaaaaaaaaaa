import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';

// GET /api/acars/online — count pilots with recent ACARS heartbeat (last 2 minutes)
export async function GET() {
    try {
        await connectDB();

        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const count = await Pilot.countDocuments({
            last_activity: { $gte: twoMinutesAgo },
        });

        return NextResponse.json({ success: true, online: count });
    } catch (error: any) {
        console.error('Online count error:', error);
        return NextResponse.json({ success: true, online: 0 });
    }
}
