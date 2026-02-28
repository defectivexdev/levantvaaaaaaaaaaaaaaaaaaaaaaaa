import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import PilotAward from '@/models/PilotAward';
import { verifyAuth } from '@/lib/auth';

// GET /api/awards/unseen - Get unseen awards for the current pilot
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const unseen = await PilotAward.find({ pilot_id: session.id, seen: { $ne: true } })
            .populate('award_id')
            .sort({ earned_at: -1 })
            .lean();

        return NextResponse.json(unseen);
    } catch (error: any) {
        console.error('Error fetching unseen awards:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST /api/awards/unseen - Mark awards as seen
export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();
        if (ids && ids.length > 0) {
            await PilotAward.updateMany(
                { _id: { $in: ids }, pilot_id: session.id },
                { $set: { seen: true } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error marking awards seen:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
