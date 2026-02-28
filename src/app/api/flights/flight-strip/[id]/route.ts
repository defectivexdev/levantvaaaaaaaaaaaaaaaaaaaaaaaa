import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import { FlightModel, PilotModel } from '@/models';

// GET /api/flights/flight-strip/[id] — returns flight strip data for sharing
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        const { id } = await params;

        const flight = await FlightModel.findById(id).lean() as any;
        if (!flight) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

        const pilot = await PilotModel.findById(flight.pilot_id).select('pilot_id first_name last_name rank').lean() as any;

        function getLandingGrade(rate: number) {
            const abs = Math.abs(rate);
            if (abs <= 60) return { label: 'BUTTER', color: '#10b981', emoji: '🧈' };
            if (abs <= 150) return { label: 'SMOOTH', color: '#22c55e', emoji: '✨' };
            if (abs <= 300) return { label: 'ACCEPTABLE', color: '#eab308', emoji: '👍' };
            if (abs <= 500) return { label: 'FIRM', color: '#f97316', emoji: '⚠️' };
            return { label: 'HARD', color: '#ef4444', emoji: '💥' };
        }

        const grade = getLandingGrade(flight.landing_rate);
        const flightHours = Math.floor(flight.flight_time / 60);
        const flightMins = flight.flight_time % 60;

        const strip = {
            // Flight info
            flight_number: flight.flight_number || flight.callsign,
            callsign: flight.callsign,
            departure_icao: flight.departure_icao,
            arrival_icao: flight.arrival_icao,
            route: flight.route || '',
            aircraft_type: flight.aircraft_type,
            // Performance
            landing_rate: flight.landing_rate,
            landing_grade: grade,
            score: flight.score || 0,
            max_g_force: flight.max_g_force || 1.0,
            // Duration
            flight_time: `${flightHours}h ${flightMins}m`,
            flight_time_minutes: flight.flight_time,
            distance: flight.distance || 0,
            fuel_used: flight.fuel_used || 0,
            // Pilot
            pilot_name: pilot ? `${pilot.first_name} ${pilot.last_name}` : flight.pilot_name,
            pilot_id: pilot?.pilot_id || '',
            pilot_rank: pilot?.rank || '',
            // Meta
            date: flight.submitted_at,
            airline: 'Levant Virtual Airlines',
            airline_code: 'LVT',
            // Earnings
            credits_earned: (flight.revenue_passenger || 0) + (flight.revenue_cargo || 0) - (flight.expense_fuel || 0) - (flight.expense_airport || 0),
            passenger_rating: flight.passenger_rating || 0,
            passenger_review: flight.passenger_review || '',
        };

        return NextResponse.json({ success: true, strip });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
