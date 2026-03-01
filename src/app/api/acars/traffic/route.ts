import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ActiveFlight from '@/models/ActiveFlight';
import { corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
    try {
        await connectDB();
        const flights = await ActiveFlight.find({
            last_update: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
        }).select('-__v -takeoff_notified -engines -lights -pitch -bank').lean();

        const traffic = flights.map((f: any) => ({
            callsign: f.callsign,
            pilotName: f.pilot_name,
            departureIcao: f.departure_icao || '',
            arrivalIcao: f.arrival_icao || '',
            aircraftType: f.aircraft_type || '',
            latitude: f.latitude,
            longitude: f.longitude,
            altitude: f.altitude,
            heading: f.heading,
            groundSpeed: f.ground_speed,
            ias: f.ias,
            verticalSpeed: f.vertical_speed,
            phase: f.phase,
            fuel: f.fuel,
            gForce: f.g_force,
            comfortScore: f.comfort_score,
            startedAt: f.started_at,
            lastUpdate: f.last_update,
        }));

        return NextResponse.json({ success: true, count: traffic.length, traffic }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS Traffic]', error);
        return NextResponse.json({ error: 'Failed to fetch traffic' }, { status: 500, headers: corsHeaders() });
    }
}

export async function POST(_request: NextRequest) {
    return GET();
}
