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
        const { pilotId, callsign } = await request.json();

        const pilot = await findPilot(pilotId);
        if (pilot) {
            // Remove ActiveFlight — if callsign given delete exact record, otherwise wipe all
            if (callsign) {
                await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
            } else {
                await ActiveFlight.deleteMany({ pilot_id: pilot._id });
            }

            // Find and delete the matching Bid; release aircraft
            const bidFilter = callsign
                ? { callsign, status: { $in: ['Active', 'InProgress'] } }
                : { status: { $in: ['Active', 'InProgress'] } };

            let matchingBid = await Bid.findOne({ pilot_id: pilot._id, ...bidFilter });
            if (!matchingBid) {
                matchingBid = await Bid.findOne({ pilot_id: pilot._id.toString(), ...bidFilter });
            }

            if (matchingBid) {
                if (matchingBid.aircraft_registration) {
                    await Fleet.updateOne(
                        { registration: matchingBid.aircraft_registration, status: 'InFlight' },
                        { $set: { status: 'Available' } }
                    );
                }
                await Bid.deleteOne({ _id: matchingBid._id });
                console.log(`[ACARS End] Deleted bid and released aircraft for ${callsign || pilotId}`);
            }
        }

        return NextResponse.json({ success: true, message: 'Flight ended' }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS End]', error);
        return NextResponse.json({ error: 'Flight end failed', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}
