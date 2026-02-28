import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import Bid from '@/models/Bid';
import { PilotModel } from '@/models';
import Airport from '@/models/Airport';

// GET /api/flights/boarding-pass — returns boarding pass data for active bid
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();

        const bid = await Bid.findOne({ pilot_id: session.id, status: 'Active' }).sort({ created_at: -1 });
        if (!bid) return NextResponse.json({ error: 'No active booking' }, { status: 404 });

        const pilot = await PilotModel.findById(session.id).select('pilot_id first_name last_name rank');
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });

        const [depAirport, arrAirport] = await Promise.all([
            Airport.findOne({ icao: bid.departure_icao }).select('name icao').lean(),
            Airport.findOne({ icao: bid.arrival_icao }).select('name icao').lean(),
        ]);

        // Generate a unique booking reference
        const bookingRef = `LVT${bid._id.toString().slice(-6).toUpperCase()}`;

        // QR code data — contains the booking reference and flight details
        const qrData = JSON.stringify({
            ref: bookingRef,
            callsign: bid.callsign,
            dep: bid.departure_icao,
            arr: bid.arrival_icao,
            pax: bid.pax || 0,
            pilot: pilot.pilot_id,
            date: bid.created_at,
        });

        const boardingPass = {
            booking_ref: bookingRef,
            airline: 'Levant Virtual Airlines',
            airline_code: 'LVT',
            callsign: bid.callsign,
            flight_number: bid.callsign,
            // Pilot info
            pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            pilot_id: pilot.pilot_id,
            pilot_rank: pilot.rank,
            // Route info
            departure_icao: bid.departure_icao,
            departure_name: depAirport?.name || bid.departure_icao,
            arrival_icao: bid.arrival_icao,
            arrival_name: arrAirport?.name || bid.arrival_icao,
            // Flight details
            aircraft_type: bid.aircraft_type,
            aircraft_registration: bid.aircraft_registration || 'TBA',
            pax: bid.pax || 0,
            cargo: bid.cargo || 0,
            estimated_time: bid.estimated_flight_time || 0,
            gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 8))}${Math.floor(Math.random() * 30) + 1}`,
            seat: '1A',
            class: 'COCKPIT',
            boarding_time: new Date().toISOString(),
            // QR code content (base64 encoded for client to render)
            qr_data: qrData,
        };

        return NextResponse.json({ success: true, boardingPass });
    } catch (error: any) {
        console.error('Boarding pass error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
