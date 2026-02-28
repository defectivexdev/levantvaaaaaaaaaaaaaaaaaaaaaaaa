import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';
import Pilot from '@/models/Pilot';

/**
 * ACARS Heartbeat / Ping Endpoint
 * 
 * Lightweight keep-alive sent every 30s by the ACARS desktop client.
 * Keeps the pilot's "Data Link" status active on the dashboard.
 * If a callsign is provided and an ActiveFlight exists, updates last_update.
 * Also updates the pilot's last_activity timestamp.
 */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { pilotId, callsign, timestamp } = await req.json();

        if (!pilotId) {
            return NextResponse.json({ error: 'Missing pilotId' }, { status: 400 });
        }

        // Look up pilot
        const pilot = await Pilot.findOne({
            $or: [
                { pilot_id: pilotId },
                { email: String(pilotId).toLowerCase() }
            ]
        });

        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Update pilot's last_activity (proves Data Link is alive)
        pilot.last_activity = new Date();
        await pilot.save();

        // If there's an active flight, refresh its last_update so it doesn't get cleaned up
        if (callsign) {
            await ActiveFlightModel.updateOne(
                { pilot_id: pilot._id, callsign },
                { $set: { last_update: new Date() } }
            );
        }

        return NextResponse.json({
            success: true,
            dataLink: 'active',
            serverTime: Date.now(),
            clientTime: timestamp || null,
        });
    } catch (error: any) {
        console.error('ACARS Ping Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
