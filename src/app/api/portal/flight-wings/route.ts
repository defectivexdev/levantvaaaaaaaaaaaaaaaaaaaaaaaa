import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import ActiveFlight from '@/models/ActiveFlight';

// GET /api/portal/flight-wings — detect pilots flying the same route at the same time
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();

        const flights = await ActiveFlight.find({
            status: { $in: ['Airborne', 'InFlight', 'Preflight', 'Taxi'] },
        }).lean() as any[];

        // Group by route (dep-arr pair)
        const routeMap = new Map<string, any[]>();
        for (const f of flights) {
            if (!f.departure_icao || !f.arrival_icao) continue;
            const key = `${f.departure_icao}-${f.arrival_icao}`;
            if (!routeMap.has(key)) routeMap.set(key, []);
            routeMap.get(key)!.push({
                callsign: f.callsign,
                pilot_name: f.pilot_name,
                aircraft_type: f.aircraft_type,
                altitude: Math.round(f.altitude || 0),
                ground_speed: Math.round(f.ground_speed || 0),
                phase: f.phase,
                latitude: f.latitude,
                longitude: f.longitude,
            });
        }

        // Only return routes with 2+ pilots (flight wings)
        const wings: any[] = [];
        for (const [route, pilots] of routeMap) {
            if (pilots.length >= 2) {
                const [dep, arr] = route.split('-');
                wings.push({
                    route: `${dep} → ${arr}`,
                    departure_icao: dep,
                    arrival_icao: arr,
                    pilots,
                    count: pilots.length,
                });
            }
        }

        return NextResponse.json({ success: true, wings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
