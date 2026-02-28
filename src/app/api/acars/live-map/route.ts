import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';
import Bid from '@/models/Bid';
import Fleet from '@/models/Fleet';

export const dynamic = 'force-dynamic';

/**
 * ACARS Live Map Endpoint
 * Sends active flight data to the web dashboard.
 * Filter: Updates within the last 10 minutes.
 * Also cleans up stale flights (>10 min) and expired bids inline.
 */

export async function GET() {
    try {
        await connectDB();
        
        const activeThreshold = new Date(Date.now() - 600000); // 10 minutes

        // Clean up stale flights (no heartbeat for 10+ minutes)
        const staleFlights = await ActiveFlightModel.find({ last_update: { $lt: activeThreshold } });
        if (staleFlights.length > 0) {
            for (const sf of staleFlights) {
                // Cancel associated bid
                await Bid.updateMany(
                    { pilot_id: sf.pilot_id, status: 'Active' },
                    { $set: { status: 'Cancelled' } }
                );
                // Reset aircraft from InFlight → Available
                if (sf.aircraft_type) {
                    await Fleet.updateMany(
                        { status: 'InFlight', aircraft_type: sf.aircraft_type },
                        { $set: { status: 'Available' } }
                    );
                }
            }
            await ActiveFlightModel.deleteMany({ last_update: { $lt: activeThreshold } });
        }

        // Also cancel expired bids (lazy cleanup)
        await Bid.updateMany(
            { status: 'Active', expires_at: { $lte: new Date() } },
            { $set: { status: 'Cancelled' } }
        );

        // Return active flights
        const flights = await ActiveFlightModel.find({ 
            last_update: { $gte: activeThreshold } 
        }).lean();

        // Transform for the LiveMap component — unified format
        const mappedFlights = flights.map((f: any) => ({
            callsign: f.callsign,
            pilot: f.pilot_name,
            departure: f.departure_icao,
            arrival: f.arrival_icao,
            equipment: f.aircraft_type,
            latitude: f.latitude,
            longitude: f.longitude,
            altitude: f.altitude,
            heading: f.heading,
            groundspeed: f.ground_speed,
            ias: f.ias || 0,
            verticalSpeed: f.vertical_speed || 0,
            phase: f.phase || f.status,
            status: f.status,
            fuel: f.fuel || 0,
            comfort_score: f.comfort_score ?? 100,
            started_at: f.started_at,
        }));

        return NextResponse.json(mappedFlights);
    } catch (error: any) {
        console.error('ACARS Live Map Error:', error);
        return NextResponse.json({ error: 'Failed to fetch live traffic' }, { status: 500 });
    }
}
