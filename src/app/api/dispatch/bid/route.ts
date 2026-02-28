import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Bid from '@/models/Bid';
import { PilotModel } from '@/models';

// POST - Create a new flight bid
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();

        const { 
            departure, 
            arrival, 
            aircraft, 
            callsign,
            route,
            estimated_flight_time,
            pax,
            cargo,
            simbrief_ofp_id,
            activity_id
        } = await request.json();

        if (!departure || !arrival || !aircraft) {
            return NextResponse.json(
                { error: 'Departure, arrival, and aircraft are required' },
                { status: 400 }
            );
        }

        // Get pilot info
        const pilot = await PilotModel.findById(session.id);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Delete any existing active bids for this pilot
        await Bid.deleteMany(
            { pilot_id: session.id, status: 'Active' }
        );

        // Create new bid
        const bid = await Bid.create({
            pilot_id: session.id,
            pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            callsign: callsign || pilot.pilot_id,
            departure_icao: departure.toUpperCase(),
            arrival_icao: arrival.toUpperCase(),
            aircraft_type: aircraft,
            route,
            estimated_flight_time,
            pax,
            cargo,
            simbrief_ofp_id,
            activity_id
        });

        return NextResponse.json({
            success: true,
            bid: {
                id: bid.id,
                callsign: bid.callsign,
                departure: bid.departure_icao,
                arrival: bid.arrival_icao,
                aircraft: bid.aircraft_type,
                expiresAt: bid.expires_at,
                route: bid.route,
                estimated_flight_time: bid.estimated_flight_time,
                pax: bid.pax,
                cargo: bid.cargo,
                simbrief_ofp_id: bid.simbrief_ofp_id,
                activity_id: bid.activity_id
            }
        });
    } catch (error: any) {
        console.error('Bid creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET - Get pilot's active bid
export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();

        // Delete any expired bids first
        await Bid.deleteMany(
            { pilot_id: session.id, status: { $in: ['Active', 'InProgress'] }, expires_at: { $lte: new Date() } }
        );

        const bid = await Bid.findOne({ 
            pilot_id: session.id, 
            status: { $in: ['Active', 'InProgress'] } 
        }).sort({ created_at: -1 });

        if (!bid) {
            return NextResponse.json({ bid: null });
        }

        return NextResponse.json({
            bid: {
                id: bid.id,
                callsign: bid.callsign,
                departure: bid.departure_icao,
                arrival: bid.arrival_icao,
                aircraft: bid.aircraft_type,
                createdAt: bid.created_at,
                expiresAt: bid.expires_at,
                route: bid.route,
                estimated_flight_time: bid.estimated_flight_time,
                pax: bid.pax,
                cargo: bid.cargo,
                simbrief_ofp_id: bid.simbrief_ofp_id,
                activity_id: bid.activity_id
            }
        });
    } catch (error: any) {
        console.error('Get bid error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Cancel a bid
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const bidId = searchParams.get('id');

        if (bidId) {
            await Bid.deleteOne(
                { _id: bidId, pilot_id: session.id }
            );
        } else {
            // Delete all active bids
            await Bid.deleteMany(
                { pilot_id: session.id, status: 'Active' }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Cancel bid error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
