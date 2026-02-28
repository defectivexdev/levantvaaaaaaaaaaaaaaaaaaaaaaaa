import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import { PilotModel } from '@/models';
import PilotAward from '@/models/PilotAward';
import Award from '@/models/Award';
import Event from '@/models/Event';
import Bid from '@/models/Bid';

// GET /api/portal/dashboard-extras — returns rank progress, awards, next event, weather
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();

        const pilot = await PilotModel.findById(session.id).select('pilot_id').lean();
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });


        // --- Recent Awards (Medal Case) ---
        const pilotAwards = await PilotAward.find({ pilot_id: session.id })
            .sort({ earned_at: -1 })
            .limit(6)
            .lean();

        const awardIds = pilotAwards.map((pa: any) => pa.award_id);
        const awards = await Award.find({ _id: { $in: awardIds } }).lean();
        const awardMap = new Map(awards.map((a: any) => [a._id.toString(), a]));

        const medalCase = pilotAwards.map((pa: any) => {
            const award = awardMap.get(pa.award_id?.toString());
            return {
                name: (award as any)?.name || 'Unknown Award',
                description: (award as any)?.description || '',
                image_url: (award as any)?.imageUrl || '',
                awarded_at: pa.earned_at,
            };
        });

        // --- Next Event Countdown ---
        const now = new Date();
        const nextEvent = await Event.findOne({
            is_active: true,
            $or: [
                { start_datetime: { $gt: now } },
                { start_time: { $gt: now } },
            ],
        }).sort({ start_datetime: 1, start_time: 1 }).lean();

        let eventCountdown = null;
        if (nextEvent) {
            const start = new Date((nextEvent as any).start_datetime || (nextEvent as any).start_time);
            const diffMs = start.getTime() - now.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            eventCountdown = {
                name: (nextEvent as any).title || (nextEvent as any).name || 'Upcoming Event',
                description: (nextEvent as any).description || '',
                start_datetime: (nextEvent as any).start_datetime,
                location: (nextEvent as any).departure_icao || (nextEvent as any).location || '',
                reward_points: (nextEvent as any).reward_points || 0,
                days: diffDays,
                hours: diffHours,
                minutes: diffMins,
            };
        }

        // --- Active Bid Weather ---
        let weather = null;
        const activeBid = await Bid.findOne({ pilot_id: session.id, status: 'Active' }).sort({ created_at: -1 }).lean();
        if (activeBid) {
            try {
                const [depMetar, arrMetar] = await Promise.all([
                    fetchMetar(activeBid.departure_icao),
                    fetchMetar(activeBid.arrival_icao),
                ]);
                weather = {
                    departure_icao: activeBid.departure_icao,
                    arrival_icao: activeBid.arrival_icao,
                    departure_metar: depMetar,
                    arrival_metar: arrMetar,
                };
            } catch { /* non-fatal */ }
        }

        const res = NextResponse.json({
            rankProgress: null,
            medalCase,
            eventCountdown,
            weather,
        });
        res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
        return res;
    } catch (error: any) {
        console.error('Dashboard extras error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function fetchMetar(icao: string): Promise<string> {
    try {
        const res = await fetch(`https://metar.vatsim.net/metar.php?id=${icao}`, { cache: 'no-store' });
        if (res.ok) {
            const text = await res.text();
            return text.trim() || `No METAR for ${icao}`;
        }
    } catch { /* ignore */ }
    return `No METAR for ${icao}`;
}
