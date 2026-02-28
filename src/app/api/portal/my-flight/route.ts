import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';
import Airport from '@/models/Airport';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/my-flight
 * Returns the currently logged-in pilot's active flight (if any).
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('lva_session')?.value;
        if (!token) {
            return NextResponse.json({ flight: null });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
        const { payload } = await jwtVerify(token, secret);

        if (!payload.id) {
            return NextResponse.json({ flight: null });
        }

        await connectDB();

        const tenMinutesAgo = new Date(Date.now() - 600000);

        const flight = await ActiveFlightModel.findOne({
            pilot_id: payload.id,
            last_update: { $gte: tenMinutesAgo },
        })
            .sort({ last_update: -1 })
            .lean();

        if (!flight) {
            return NextResponse.json({ flight: null });
        }

        // Look up airport coordinates for route drawing on PilotLiveMap
        const [depAirport, arrAirport] = await Promise.all([
            flight.departure_icao ? Airport.findOne({ icao: flight.departure_icao }).select('latitude longitude').lean() : null,
            flight.arrival_icao ? Airport.findOne({ icao: flight.arrival_icao }).select('latitude longitude').lean() : null,
        ]);

        return NextResponse.json({
            flight: {
                callsign: flight.callsign,
                pilot: flight.pilot_name,
                departure: flight.departure_icao,
                arrival: flight.arrival_icao,
                equipment: flight.aircraft_type,
                latitude: flight.latitude,
                longitude: flight.longitude,
                altitude: flight.altitude,
                heading: flight.heading,
                groundSpeed: flight.ground_speed,
                ias: flight.ias || 0,
                verticalSpeed: flight.vertical_speed || 0,
                phase: flight.phase || flight.status,
                status: flight.status,
                fuel: flight.fuel || 0,
                comfort_score: flight.comfort_score ?? 100,
                started_at: flight.started_at,
            },
            depCoord: depAirport ? { lat: depAirport.latitude, lng: depAirport.longitude } : null,
            arrCoord: arrAirport ? { lat: arrAirport.latitude, lng: arrAirport.longitude } : null,
        });
    } catch (error: any) {
        console.error('My-flight API error:', error);
        return NextResponse.json({ flight: null });
    }
}
