import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ActiveFlight from '@/models/ActiveFlight';
import Bid from '@/models/Bid';
import { triggerFlightUpdate } from '@/lib/pusher';
import { notifyTakeoff, notifyModeration } from '@/lib/discord';
import { findPilot, haversineNm, corsHeaders, positionCache, SLEW_DISTANCE_NM, SLEW_TIME_MS } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const {
            pilotId, callsign, latitude, longitude, altitude, heading, groundSpeed, status,
            ias, vs, phase, fuel, engines, lights, pitch, bank,
            g_force, gForce: gForceCamel,
            comfort_score, comfortScore: comfortScoreCamel,
        } = body;

        const resolvedGForce = g_force ?? gForceCamel ?? 1.0;
        const resolvedComfort = comfort_score ?? comfortScoreCamel ?? 100;

        const pilot = await findPilot(pilotId);
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });

        if (pilot.status === 'Blacklist') {
            return NextResponse.json({ error: 'Account blacklisted' }, { status: 403, headers: corsHeaders() });
        }

        // Slew/Teleport Detection
        const now = Date.now();
        const lastPos = positionCache.get(pilotId);
        if (lastPos && latitude && longitude) {
            const elapsed = now - lastPos.ts;
            if (elapsed < SLEW_TIME_MS && elapsed > 0) {
                const distNm = haversineNm(lastPos.lat, lastPos.lon, latitude, longitude);
                if (distNm > SLEW_DISTANCE_NM) {
                    console.warn(`[SLEW] ${pilotId} moved ${distNm.toFixed(1)}nm in ${(elapsed / 1000).toFixed(0)}s`);
                    notifyModeration('slew_detect', `${pilot.first_name} ${pilot.last_name}`, pilotId,
                        `Moved **${distNm.toFixed(1)} nm** in **${(elapsed / 1000).toFixed(0)}s** (threshold: ${SLEW_DISTANCE_NM}nm / ${SLEW_TIME_MS / 1000}s)`
                    ).catch(() => {});
                }
            }
        }
        positionCache.set(pilotId, { lat: latitude, lon: longitude, ts: now });

        let flight = await ActiveFlight.findOneAndUpdate(
            { pilot_id: pilot._id, callsign },
            {
                latitude, longitude, altitude, heading,
                ground_speed: groundSpeed, status,
                ias: ias || 0, vertical_speed: vs || 0,
                phase: phase || status, fuel: fuel || 0,
                engines: engines || 0, lights: lights || 0,
                pitch: pitch || 0, bank: bank || 0,
                g_force: resolvedGForce, comfort_score: resolvedComfort,
                last_update: new Date(),
            },
            { new: true }
        );

        // Recovery upsert if flight not found
        if (!flight) {
            console.log(`[ACARS Position] ${callsign} not found, attempting recovery...`);
            let activeBid = await Bid.findOne({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } }).sort({ created_at: -1 });
            if (!activeBid) activeBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: { $in: ['Active', 'InProgress'] } }).sort({ created_at: -1 });

            flight = await ActiveFlight.findOneAndUpdate(
                { callsign },
                {
                    $set: {
                        latitude, longitude, altitude, heading,
                        ground_speed: groundSpeed, status,
                        last_update: new Date(),
                        ias: ias || 0, vertical_speed: vs || 0,
                        phase: phase || status, fuel: fuel || 0,
                        engines: engines || 0, lights: lights || 0,
                        pitch: pitch || 0, bank: bank || 0,
                        g_force: resolvedGForce, comfort_score: resolvedComfort,
                    },
                    $setOnInsert: {
                        pilot_id: pilot._id,
                        pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                        departure_icao: activeBid?.departure_icao || '????',
                        arrival_icao: activeBid?.arrival_icao || '????',
                        aircraft_type: activeBid?.aircraft_type || 'Unknown',
                        started_at: new Date(),
                    },
                },
                { new: true, upsert: true }
            );
            console.log('[ACARS Position] Flight session recovered via upsert.');
        }

        // Takeoff notification — fires once per flight on 'Takeoff' phase
        if (flight && !flight.takeoff_notified && (phase === 'Takeoff' || status === 'Takeoff')) {
            flight.takeoff_notified = true;
            await flight.save();
            await notifyTakeoff(
                `${pilot.first_name} ${pilot.last_name}`,
                pilotId,
                flight.departure_icao,
                flight.arrival_icao,
                flight.aircraft_type,
                callsign
            );
        }

        // Broadcast to dashboard via Pusher
        await triggerFlightUpdate({
            callsign, pilotId, latitude, longitude, altitude, heading, groundSpeed, status,
            ias: ias || 0, verticalSpeed: vs || 0,
            phase: phase || status,
            departure: flight?.departure_icao,
            arrival: flight?.arrival_icao,
            equipment: flight?.aircraft_type,
            comfort_score: flight?.comfort_score ?? 100,
            fuel: flight?.fuel || 0,
        });

        return NextResponse.json({ success: true }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS Position]', error);
        return NextResponse.json({ error: 'Position update failed', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}
