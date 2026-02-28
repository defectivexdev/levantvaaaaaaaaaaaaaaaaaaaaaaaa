import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const { simbriefId } = await request.json();
        
        console.log(`[Settings] Saving SimBrief ID for pilot ${session.id}:`, simbriefId);

        const updatedPilot = await PilotModel.findByIdAndUpdate(
            session.id, 
            { simbrief_id: simbriefId },
            { new: true }
        );
        
        if (!updatedPilot) {
            console.error(`[Settings] Pilot not found with ID: ${session.id}`);
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }
        
        console.log(`[Settings] Successfully saved SimBrief ID ${simbriefId} for pilot ${updatedPilot.pilot_id}`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Settings] Save SimBrief ID error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
