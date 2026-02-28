import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import ActiveFlight from '@/models/ActiveFlight';

// GET /api/portal/delays — show pilots currently experiencing delays (headwinds, holding, slow ground speed)
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();

        const flights = await ActiveFlight.find({
            status: { $in: ['Airborne', 'InFlight'] },
        }).lean();

        const delays: any[] = [];

        for (const f of flights as any[]) {
            const reasons: string[] = [];

            // Detect holding pattern: low ground speed + high altitude + circling (bank angle)
            if (f.ground_speed < 180 && f.altitude > 5000 && Math.abs(f.bank || 0) > 15) {
                reasons.push('Holding Pattern');
            }

            // Detect strong headwinds: IAS much higher than ground speed
            if (f.ias && f.ground_speed && f.ias > 0) {
                const headwind = f.ias - f.ground_speed;
                if (headwind > 50) {
                    reasons.push(`Strong Headwind (~${Math.round(headwind)}kt)`);
                }
            }

            // Detect approach delays: low altitude, low speed, phase is approach for extended time
            if (f.phase === 'Approach' && f.ground_speed < 160 && f.altitude < 3000) {
                reasons.push('Extended Approach');
            }

            if (reasons.length > 0) {
                delays.push({
                    callsign: f.callsign,
                    pilot_name: f.pilot_name,
                    departure_icao: f.departure_icao,
                    arrival_icao: f.arrival_icao,
                    aircraft_type: f.aircraft_type,
                    altitude: Math.round(f.altitude),
                    ground_speed: Math.round(f.ground_speed),
                    ias: Math.round(f.ias || 0),
                    phase: f.phase,
                    reasons,
                });
            }
        }

        return NextResponse.json({ success: true, delays });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
