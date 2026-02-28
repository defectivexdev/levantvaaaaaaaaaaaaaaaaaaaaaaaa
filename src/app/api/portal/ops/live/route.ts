import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { ActiveFlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';
import Bid from '@/models/Bid';
import Fleet from '@/models/Fleet';

// Merged Live Ops Route
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network'); // 'vatsim' | null

    try {
        await connectDB();
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Clean up stale flights (no heartbeat for 5+ minutes)
        const staleFlights = await ActiveFlightModel.find({ last_update: { $lt: fiveMinutesAgo } });
        if (staleFlights.length > 0) {
            for (const sf of staleFlights) {
                await Bid.updateMany(
                    { pilot_id: sf.pilot_id, status: 'Active' },
                    { $set: { status: 'Cancelled' } }
                );
                if (sf.aircraft_type) {
                    await Fleet.updateMany(
                        { status: 'InFlight', aircraft_type: sf.aircraft_type },
                        { $set: { status: 'Available' } }
                    );
                }
            }
            await ActiveFlightModel.deleteMany({ last_update: { $lt: fiveMinutesAgo } });
        }

        // Cancel expired bids (lazy cleanup)
        await Bid.updateMany(
            { status: 'Active', expires_at: { $lte: new Date() } },
            { $set: { status: 'Cancelled' } }
        );

        // 1. Fetch Internal ACARS Flights
        const internalFlights = await ActiveFlightModel.find({
            last_update: { $gte: fiveMinutesAgo }
        }).sort({ last_update: -1 });

        // Map Internal to Common Format (matches DashboardMap interface)
        const mappedInternal = internalFlights.map(f => ({
            _id: f.id,
            callsign: f.callsign,
            pilot: f.pilot_name,
            pilot_name: f.pilot_name,
            departure: f.departure_icao,
            departure_icao: f.departure_icao,
            arrival: f.arrival_icao,
            arrival_icao: f.arrival_icao,
            equipment: f.aircraft_type,
            aircraft_type: f.aircraft_type,
            latitude: f.latitude,
            longitude: f.longitude,
            altitude: f.altitude,
            heading: f.heading,
            groundSpeed: f.ground_speed,
            ground_speed: f.ground_speed,
            verticalSpeed: f.vertical_speed,
            ias: f.ias,
            fuel: f.fuel,
            phase: f.phase,
            status: f.status,
            comfort_score: f.comfort_score,
            network: 'LEVANT'
        }));

        let finalFlights = [...mappedInternal];

        // 2. Fetch Network Traffic if requested
        if (network && network !== 'off') {
            const baseUrl = request.nextUrl.origin;
            try {
                const endpoint = `${baseUrl}/api/network/vatsim`;

                const netRes = await fetch(endpoint, { cache: 'no-store' });
                const netData = await netRes.json();
                
                if (netData.pilots) {
                    finalFlights = [...finalFlights, ...netData.pilots];
                }
            } catch (err) {
                console.error(`Failed to fetch ${network} traffic:`, err);
            }
        }

        return NextResponse.json({ 
            success: true, 
            flights: finalFlights,
            stats: {
                total: finalFlights.length,
                levant: mappedInternal.length,
                network: finalFlights.length - mappedInternal.length
            }
        });

    } catch (error) {
        console.error('Error fetching live operations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
