import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';
import { PilotModel } from '@/models';

// GET - Get all active flights for live map
export async function GET() {
    try {
        await connectDB();

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const flights = await ActiveFlightModel.find({
            last_update: { $gte: fiveMinutesAgo }
        }).sort({ last_update: -1 }).lean();

        const formattedFlights = flights.map(flight => ({
            id: (flight._id || flight.id)?.toString(),
            callsign: flight.callsign,
            pilot_name: flight.pilot_name,
            latitude: flight.latitude,
            longitude: flight.longitude,
            altitude: flight.altitude,
            heading: flight.heading,
            ground_speed: flight.ground_speed,
            departure_icao: flight.departure_icao,
            arrival_icao: flight.arrival_icao,
            aircraft_type: flight.aircraft_type,
            status: flight.status,
        }));

        return NextResponse.json({ flights: formattedFlights });
    } catch (error) {
        console.error('Error fetching flights:', error);
        return NextResponse.json({ flights: [] });
    }
}

// POST - ACARS position update from client
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const data = await request.json();

        const {
            pilotId,
            callsign,
            departureIcao,
            arrivalIcao,
            aircraftType,
            latitude,
            longitude,
            altitude,
            heading,
            groundSpeed,
            status,
        } = data;

        if (!pilotId || !callsign || latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Fetch pilot name
        let pilotName = 'Unknown Pilot';
        const pilot = await PilotModel.findById(pilotId);
        if (pilot) {
            pilotName = `${pilot.first_name} ${pilot.last_name}`;
        }

        // Upsert active flight
        await ActiveFlightModel.findOneAndUpdate(
            { pilot_id: pilotId, callsign },
            {
                pilot_id: pilotId,
                pilot_name: pilotName,
                callsign,
                departure_icao: departureIcao || '',
                arrival_icao: arrivalIcao || '',
                aircraft_type: aircraftType || '',
                latitude,
                longitude,
                altitude: altitude || 0,
                heading: heading || 0,
                ground_speed: groundSpeed || 0,
                status: status || 'Enroute',
                last_update: new Date(),
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('ACARS update error:', error);
        return NextResponse.json(
            { error: 'Failed to update flight position: ' + error.message },
            { status: 500 }
        );
    }
}

// DELETE - End a flight
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { pilotId, callsign } = await request.json();

        await ActiveFlightModel.deleteOne({ pilot_id: pilotId, callsign });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Flight end error:', error);
        return NextResponse.json(
            { error: 'Failed to end flight' },
            { status: 500 }
        );
    }
}
