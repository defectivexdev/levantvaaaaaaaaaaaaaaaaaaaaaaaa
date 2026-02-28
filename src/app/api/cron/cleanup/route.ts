import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Bid from '@/models/Bid';
import { ActiveFlightModel } from '@/models';
import Fleet from '@/models/Fleet';
import ChatMessage from '@/models/ChatMessage';

export const dynamic = 'force-dynamic';

/**
 * Cron Cleanup Endpoint
 * 
 * 1. Cancel expired bids (Active bids past their expires_at)
 * 2. Remove stale ActiveFlights (no heartbeat for 5+ minutes)
 *    - Also cancels associated bids
 *    - Resets aircraft status from InFlight → Available
 * 3. Clear chat messages from before today 00:00 UTC
 * 
 * Call this via Vercel Cron, GitHub Actions, or external pinger every 1-2 minutes.
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const now = new Date();
        let expiredBids = 0;
        let staleFlights = 0;

        // ── 1. Delete expired Active bids (past expires_at) ──
        const expiredResult = await Bid.deleteMany(
            { status: 'Active', expires_at: { $lte: now } }
        );
        expiredBids = expiredResult.deletedCount || 0;

        // ── 2. Remove stale ActiveFlights (no update for 5+ minutes) ──
        const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
        const staleActiveFlights = await ActiveFlightModel.find({
            last_update: { $lt: staleThreshold }
        });

        for (const flight of staleActiveFlights) {
            // Delete associated active bid
            await Bid.deleteMany(
                { pilot_id: flight.pilot_id, status: 'Active' }
            );

            // Reset aircraft status if it was InFlight
            if (flight.aircraft_type) {
                await Fleet.updateMany(
                    { 
                        status: 'InFlight',
                        aircraft_type: flight.aircraft_type,
                        current_location: flight.departure_icao 
                    },
                    { $set: { status: 'Available' } }
                );
            }

            // Delete the stale ActiveFlight
            await ActiveFlightModel.deleteOne({ _id: flight._id });
            staleFlights++;
        }

        // ── 3. Clear chat messages from before today 00:00 UTC ──
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        const chatResult = await ChatMessage.deleteMany({ created_at: { $lt: todayUtc } });
        const clearedChat = chatResult.deletedCount || 0;

        return NextResponse.json({
            success: true,
            cleaned: { expiredBids, staleFlights, clearedChat },
            timestamp: now.toISOString()
        });
    } catch (error: any) {
        console.error('Cleanup cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
