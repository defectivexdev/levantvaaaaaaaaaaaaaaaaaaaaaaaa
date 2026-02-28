import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel, Bid, ActiveFlightModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        await connectDB();
        const pilot = await PilotModel.findById(session.id);
        
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        const simbriefId = pilot.simbrief_id;
        if (!simbriefId) {
            return NextResponse.json({ 
                error: 'SimBrief ID not configured. Please add your SimBrief ID in Settings.' 
            }, { status: 400 });
        }

        const pilotName = [pilot.first_name, pilot.last_name].filter(Boolean).join(' ') || pilot.pilot_id;
        console.log(`[SimBrief-to-Bid] Fetching SimBrief for pilot ${pilot.pilot_id} (${pilotName}), SimBrief ID: ${simbriefId}`);

        // Fetch from SimBrief
        let sbRes;
        try {
            sbRes = await fetch(
                `https://www.simbrief.com/api/xml.fetcher.php?userid=${simbriefId}&json=v2`,
                { cache: 'no-store', headers: { 'User-Agent': 'LevantVA/1.0' } }
            );
        } catch (fetchErr: any) {
            console.error('[SimBrief-to-Bid] Network error fetching SimBrief:', fetchErr.message);
            return NextResponse.json({ 
                error: 'Could not connect to SimBrief. Please try again later.' 
            }, { status: 502 });
        }

        if (!sbRes.ok) {
            console.error(`[SimBrief-to-Bid] SimBrief HTTP error: ${sbRes.status}`);
            return NextResponse.json({ 
                error: `SimBrief returned an error (HTTP ${sbRes.status}). Check your SimBrief ID.` 
            }, { status: 502 });
        }

        let sbData;
        try {
            sbData = await sbRes.json();
        } catch (parseErr) {
            console.error('[SimBrief-to-Bid] Failed to parse SimBrief response');
            return NextResponse.json({ 
                error: 'Invalid response from SimBrief. Please try again.' 
            }, { status: 502 });
        }

        if (sbData?.fetch?.status !== 'Success') {
            return NextResponse.json({ 
                error: 'No flight plan found on SimBrief. Create one at simbrief.com first.' 
            }, { status: 404 });
        }

        // Validate critical SimBrief fields
        const depIcao = sbData.origin?.icao_code;
        const arrIcao = sbData.destination?.icao_code;
        const callsign = sbData.atc?.callsign || pilot.pilot_id;
        const aircraftType = sbData.aircraft?.icaocode;

        if (!depIcao || !arrIcao) {
            return NextResponse.json({ 
                error: 'SimBrief flight plan is missing departure or arrival airport.' 
            }, { status: 400 });
        }

        if (!aircraftType) {
            return NextResponse.json({ 
                error: 'SimBrief flight plan is missing aircraft type.' 
            }, { status: 400 });
        }

        // Delete any existing active/in-progress bids for this pilot
        await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
        console.log(`[SimBrief-to-Bid] Cleared existing bids for pilot ${pilot.pilot_id}`);

        // Create bid from SimBrief data
        const bid = await Bid.create({
            pilot_id: pilot._id,
            pilot_name: pilotName,
            callsign,
            departure_icao: depIcao,
            arrival_icao: arrIcao,
            aircraft_type: aircraftType,
            aircraft_registration: sbData.aircraft?.reg || '',
            route: sbData.general?.route || '',
            pax: parseInt(sbData.weights?.pax_count || '0') || 0,
            cargo: parseInt(sbData.weights?.cargo || '0') || 0,
            simbrief_ofp_id: sbData.params?.ofp_id || '',
            planned_fuel: parseInt(sbData.fuel?.plan_ramp || '0') || 0,
            status: 'Active',
            created_at: new Date(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        console.log(`[SimBrief-to-Bid] Created bid ${bid._id} for ${pilot.pilot_id}: ${depIcao} → ${arrIcao} (${aircraftType})`);

        return NextResponse.json({ 
            success: true,
            bid: {
                id: bid._id,
                flightNumber: callsign,
                callsign: bid.callsign,
                departureIcao: bid.departure_icao,
                arrivalIcao: bid.arrival_icao,
                aircraftType: bid.aircraft_type,
                route: bid.route || '',
            }
        });
    } catch (error: any) {
        console.error('[SimBrief-to-Bid] Unexpected error:', error.message, error.stack);
        return NextResponse.json({ 
            error: 'Failed to create bid from SimBrief: ' + (error.message || 'Unknown error')
        }, { status: 500 });
    }
}

// GET: Fetch current active bid for the authenticated pilot
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        const bid = await Bid.findOne({ 
            pilot_id: session.id, 
            status: { $in: ['Active', 'InProgress'] } 
        }).sort({ created_at: -1 }).lean();

        if (!bid) return NextResponse.json({ bid: null });

        // Check if there's an active flight for this bid
        const activeFlight = await ActiveFlightModel.findOne({ pilot_id: session.id }).lean();

        return NextResponse.json({
            bid: {
                id: bid._id,
                flightNumber: bid.callsign,
                callsign: bid.callsign,
                departureIcao: bid.departure_icao,
                arrivalIcao: bid.arrival_icao,
                aircraftType: bid.aircraft_type,
                route: bid.route || '',
                status: bid.status,
            },
            hasActiveFlight: !!activeFlight,
        });
    } catch (error: any) {
        console.error('[SimBrief-to-Bid GET] Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch bid' }, { status: 500 });
    }
}

// DELETE: Cancel active bid and active flight
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();

        // Cancel all active/in-progress bids for this pilot
        const bidResult = await Bid.updateMany(
            { pilot_id: session.id, status: { $in: ['Active', 'InProgress'] } },
            { $set: { status: 'Cancelled' } }
        );

        // Remove any active flight tracking
        const flightResult = await ActiveFlightModel.deleteMany({ pilot_id: session.id });

        console.log(`[Cancel Flight] Pilot ${session.pilotId}: cancelled ${bidResult.modifiedCount} bid(s), removed ${flightResult.deletedCount} active flight(s)`);

        return NextResponse.json({ 
            success: true,
            message: 'Flight cancelled successfully',
            cancelledBids: bidResult.modifiedCount,
            removedFlights: flightResult.deletedCount,
        });
    } catch (error: any) {
        console.error('[Cancel Flight] Error:', error.message);
        return NextResponse.json({ error: 'Failed to cancel flight' }, { status: 500 });
    }
}
