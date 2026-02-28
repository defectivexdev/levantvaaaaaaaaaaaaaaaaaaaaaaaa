import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ user: null });
        }

        // Fetch additional user data from database
        await connectDB();
        const pilot = await Pilot.findById(session.id).select('simbrief_id pilot_id desired_callsign balance inventory total_hours transfer_hours hoppie_code sim_mode weight_unit vatsim_cid ivao_vid');

        return NextResponse.json({
            user: {
                id: session.id,
                pilotId: pilot?.pilot_id || session.pilotId, // Always use DB value as source of truth
                email: session.email,
                isAdmin: session.isAdmin,
                role: session.isAdmin ? 'Admin' : 'Pilot',
                status: (pilot as any)?.status,
                simbriefId: pilot?.simbrief_id || '',
                hoppieCode: pilot?.hoppie_code || '',
                simMode: pilot?.sim_mode || '',
                weightUnit: pilot?.weight_unit || 'lbs',
                vatsim_cid: pilot?.vatsim_cid || '',
                ivao_vid: pilot?.ivao_vid || '',
                customCallsign: pilot?.desired_callsign || '',
                totalHours: (pilot?.total_hours || 0) + (pilot?.transfer_hours || 0),
                balance: pilot?.balance || 0,
                inventory: pilot?.inventory || [],
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ user: null });
    }
}
