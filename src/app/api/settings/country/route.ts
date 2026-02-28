import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        await connectDB();

        const { country } = await request.json();

        const pilot = await PilotModel.findByIdAndUpdate(
            session.id,
            { country: country?.toUpperCase() || '' },
            { new: true }
        );

        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Country update error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update country' }, { status: 500 });
    }
}
