import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();

        const { hoppieCode, simMode, weightUnit } = await request.json();

        const update: Record<string, any> = {};
        if (hoppieCode !== undefined) update.hoppie_code = hoppieCode;
        if (simMode && ['fsuipc', 'xpuipc'].includes(simMode)) update.sim_mode = simMode;
        if (weightUnit && ['lbs', 'kgs'].includes(weightUnit)) update.weight_unit = weightUnit;

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        await PilotModel.findByIdAndUpdate(session.id, update);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Save ACARS settings error:', error);
        return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
    }
}
