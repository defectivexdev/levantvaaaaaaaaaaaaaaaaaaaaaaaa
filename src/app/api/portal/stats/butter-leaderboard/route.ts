import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { FlightModel } from '@/models';

export async function GET() {
    try {
        await connectDB();

        // Filter for landings in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch top 5 accepted flights with the best landing rates
        const bestLandings = await FlightModel.find({
            approved_status: 1,
            submitted_at: { $gte: thirtyDaysAgo },
            landing_rate: { $lte: 0, $gte: -200 } 
        })
        .sort({ landing_rate: -1 })
        .limit(5)
        .select('pilot_name callsign arrival_icao landing_rate aircraft_type submitted_at log.landingAnalysis.butterScore')
        .lean();

        return NextResponse.json({ success: true, landings: bestLandings });
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
