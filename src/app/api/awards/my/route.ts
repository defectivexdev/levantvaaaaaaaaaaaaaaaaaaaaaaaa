import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import PilotAward from '@/models/PilotAward';
import { verifyAuth } from '@/lib/auth';

// GET /api/awards/my - Get current pilot's earned awards
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const pilotAwards = await PilotAward.find({ pilot_id: session.id })
            .populate('award_id')
            .sort({ earned_at: -1 })
            .lean();
        
        return NextResponse.json(pilotAwards);
    } catch (error: any) {
        console.error('Error fetching pilot awards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pilot awards' },
            { status: 500 }
        );
    }
}
