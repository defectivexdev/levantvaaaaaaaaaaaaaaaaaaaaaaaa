import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Flight from '@/models/Flight';

/**
 * Admin endpoint to fix flights stuck in Pending status (approved_status = 0)
 * Updates them to Approved (1) or Rejected (2) based on landing rate
 */
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const AUTO_REJECT_THRESHOLD = parseInt(process.env.AUTO_PIREP_REJECT_LANDING_RATE || '-700');

        // Find all flights with approved_status = 0 (Pending)
        const pendingFlights = await Flight.find({ approved_status: 0 });
        
        let approvedCount = 0;
        let rejectedCount = 0;
        let skippedCount = 0;

        const results = [];

        for (const flight of pendingFlights) {
            const landingRate = flight.landing_rate || 0;
            
            // If landing rate is above the rejection threshold, approve it
            if (landingRate > AUTO_REJECT_THRESHOLD) {
                await Flight.updateOne(
                    { _id: flight._id },
                    { $set: { approved_status: 1 } }
                );
                approvedCount++;
                results.push({
                    status: 'approved',
                    callsign: flight.callsign,
                    route: `${flight.departure_icao}→${flight.arrival_icao}`,
                    landingRate
                });
            }
            // If landing rate is at or below threshold, reject it
            else if (landingRate <= AUTO_REJECT_THRESHOLD) {
                await Flight.updateOne(
                    { _id: flight._id },
                    { $set: { approved_status: 2 } }
                );
                rejectedCount++;
                results.push({
                    status: 'rejected',
                    callsign: flight.callsign,
                    route: `${flight.departure_icao}→${flight.arrival_icao}`,
                    landingRate
                });
            }
            else {
                skippedCount++;
                results.push({
                    status: 'skipped',
                    callsign: flight.callsign,
                    route: `${flight.departure_icao}→${flight.arrival_icao}`,
                    landingRate
                });
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: pendingFlights.length,
                approved: approvedCount,
                rejected: rejectedCount,
                skipped: skippedCount
            },
            results
        });

    } catch (error: any) {
        console.error('Fix pending flights error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
