import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';

// --- IVAO WhazzUp cache (respect 15-second minimum interval) ---
let ivaoCache: { data: any[]; ts: number } = { data: [], ts: 0 };
const IVAO_CACHE_MS = 15_000;
const IVAO_WHAZZUP_URL = 'https://api.ivao.aero/v2/tracker/whazzup';

async function fetchIvaoTraffic(): Promise<any[]> {
    if (Date.now() - ivaoCache.ts < IVAO_CACHE_MS) return ivaoCache.data;

    try {
        const res = await fetch(IVAO_WHAZZUP_URL, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return ivaoCache.data;

        const json = await res.json();
        const pilots: any[] = json?.clients?.pilots || [];

        const mapped = pilots
            .filter((p: any) => p.lastTrack?.latitude && p.lastTrack?.longitude)
            .map((p: any) => ({
                callsign: p.callsign || 'UNKNOWN',
                pilot: `IVAO ${p.userId || ''}`,
                departure: p.flightPlan?.departureId || '????',
                arrival: p.flightPlan?.arrivalId || '????',
                equipment: p.flightPlan?.aircraft?.icaoCode || p.flightPlan?.aircraftId || '????',
                latitude: p.lastTrack.latitude,
                longitude: p.lastTrack.longitude,
                altitude: p.lastTrack.altitude || 0,
                heading: p.lastTrack.heading || 0,
                groundSpeed: p.lastTrack.groundSpeed || 0,
                ias: 0,
                verticalSpeed: 0,
                phase: p.lastTrack.state || 'Unknown',
                fuel: 0,
                engines: 0,
                lights: 0,
                pitch: 0,
                bank: 0,
                gForce: 0,
                status: p.lastTrack.state || 'Unknown',
                isGlobal: true,
                network: 'IVAO',
            }));

        ivaoCache = { data: mapped, ts: Date.now() };
        return mapped;
    } catch (err) {
        console.error('IVAO WhazzUp fetch error:', err);
        return ivaoCache.data;
    }
}

const getActiveFlights = async () => {
    await connectDB();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Auto-cleanup: delete flights stale for 15+ minutes (crashed ACARS, etc.)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await ActiveFlightModel.deleteMany({ last_update: { $lt: fifteenMinutesAgo } });

    // Deduplicate by callsign — keep only the most recently updated entry
    const flights = await ActiveFlightModel.aggregate([
        { $match: { last_update: { $gte: fiveMinutesAgo } } },
        { $sort: { last_update: -1 } },
        { $group: {
            _id: '$callsign',
            doc: { $first: '$$ROOT' },
        }},
        { $replaceRoot: { newRoot: '$doc' } },
        { $sort: { last_update: -1 } },
    ]);

    return flights.map((flight: any) => ({
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
        ias: flight.ias,
        verticalSpeed: flight.vertical_speed,
        phase: flight.phase,
        fuel: flight.fuel,
        engines: flight.engines,
        lights: flight.lights,
        pitch: flight.pitch,
        bank: flight.bank,
        gForce: flight.g_force,
        status: flight.status,
        isGlobal: false,
        network: 'LVT',
    }));
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const showGlobal = searchParams.get('global') === 'true';

    try {
        const vaFlights = await getActiveFlights();

        if (!showGlobal) {
            return NextResponse.json({ activeFlights: vaFlights });
        }

        // Merge VA flights with IVAO global traffic
        const ivaoFlights = await fetchIvaoTraffic();
        // VA callsigns take priority — exclude IVAO entries with the same callsign
        const vaCallsigns = new Set(vaFlights.map((f: any) => f.callsign));
        const mergedIvao = ivaoFlights.filter((f: any) => !vaCallsigns.has(f.callsign));

        return NextResponse.json({ activeFlights: [...vaFlights, ...mergedIvao] });
    } catch (error) {
        console.error('Active flights API Error:', error);
        return NextResponse.json({ activeFlights: [] });
    }
}
