import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ActiveFlight from '@/models/ActiveFlight';
import Fleet from '@/models/Fleet';
import Bid from '@/models/Bid';
import { findPilot, corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { pilotId, callsign, departureIcao, arrivalIcao, aircraftType } = await request.json();

        const pilot = await findPilot(pilotId);
        if (!pilot) {
            console.error(`[ACARS Start] Pilot not found: ${pilotId}`);
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });
        }

        const pilotName = `${pilot.first_name} ${pilot.last_name}`;
        console.log(`[ACARS Start] ${pilot.pilot_id} (${pilotName}): ${callsign} ${departureIcao}→${arrivalIcao}`);

        // Clear any existing active flight for this pilot
        const deleted = await ActiveFlight.deleteMany({ pilot_id: pilot._id });
        if (deleted.deletedCount > 0) {
            console.log(`[ACARS Start] Cleared ${deleted.deletedCount} existing active flight(s)`);
        }

        // Find active bid — multiple strategies
        let activeBid = await Bid.findOne({ pilot_id: pilot._id, callsign, status: 'Active' });
        if (!activeBid) activeBid = await Bid.findOne({ pilot_id: pilot._id.toString(), callsign, status: 'Active' });
        if (!activeBid) {
            activeBid = await Bid.findOne({ pilot_id: pilot._id, status: 'Active' }).sort({ created_at: -1 });
            if (activeBid) console.log(`[ACARS Start] Bid callsign mismatch: bid=${activeBid.callsign} requested=${callsign}`);
        }
        if (!activeBid) activeBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: 'Active' }).sort({ created_at: -1 });

        if (activeBid) {
            activeBid.status = 'InProgress';
            await activeBid.save();
            if (activeBid.aircraft_registration) {
                await Fleet.updateOne(
                    { registration: activeBid.aircraft_registration, status: { $ne: 'Grounded' } },
                    { $set: { status: 'InFlight' } }
                );
                console.log(`[ACARS Start] Marked ${activeBid.aircraft_registration} as InFlight`);
            }
        } else {
            console.warn(`[ACARS Start] No Active bid for ${pilot.pilot_id} — flight starts without bid`);
        }

        const newFlight = await ActiveFlight.create({
            pilot_id: pilot._id,
            pilot_name: pilotName,
            callsign,
            departure_icao: departureIcao,
            arrival_icao: arrivalIcao,
            aircraft_type: aircraftType,
            latitude: 0,
            longitude: 0,
            status: 'Preflight',
            started_at: new Date(),
            last_update: new Date(),
        });

        console.log(`[ACARS Start] Created ActiveFlight ${newFlight._id} for ${callsign}`);
        return NextResponse.json({ success: true, message: 'Flight started' }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS Start]', error.message, error.stack);
        return NextResponse.json({ error: 'Failed to start flight', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}
