import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import { FlightModel } from '@/models';

// Helper to construct Cloudinary avatar URL from pilot_id
const getAvatarUrl = (pilotId: string) => 
    `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ""}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilotId}`;

// Filter out admin/system accounts from public leaderboard
const HIDDEN_PILOTS = { pilot_id: { $nin: ['LVT0000', 'LVT0001'] }, first_name: { $ne: 'Admin' } };

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all-time';

    try {
        await connectDB();
        
        if (type === 'all-time') {
            const pilots = await PilotModel.find({ status: 'Active', ...HIDDEN_PILOTS })
                .select('pilot_id first_name last_name total_hours total_flights rank avatar_url')
                .sort({ total_hours: -1 })
                .limit(20)
                .lean();

            const leaderboard = pilots.map((pilot, index) => ({
                rank: index + 1,
                pilotId: pilot.pilot_id,
                name: `${pilot.first_name} ${pilot.last_name}`,
                hours: pilot.total_hours || 0,
                flights: pilot.total_flights || 0,
                pilotRank: pilot.rank || 'Cadet',
                avatarUrl: pilot.avatar_url || getAvatarUrl(pilot.pilot_id)
            }));

            return NextResponse.json({ pilots: leaderboard });
        }

        if (type === 'monthly') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const flights = await FlightModel.aggregate([
                { $match: { submitted_at: { $gte: startOfMonth }, approved_status: 1 } },
                { $group: {
                    _id: "$pilot_id",
                    hours: { $sum: { $divide: ["$flight_time", 60] } },
                    flights: { $sum: 1 },
                    pilot_name: { $first: "$pilot_name" }
                }},
                { $sort: { hours: -1 } },
                { $limit: 10 }
            ]);

            // Need to fetch pilot_id details for rank and pilot_id string
            const leaderboard = await Promise.all(flights.map(async (f, index) => {
                const pilot = await PilotModel.findById(f._id).select('pilot_id rank avatar_url').lean();
                return {
                    rank: index + 1,
                    pilotId: pilot?.pilot_id || 'UNKNOWN',
                    name: f.pilot_name,
                    hours: f.hours,
                    flights: f.flights,
                    pilotRank: pilot?.rank || 'Cadet',
                    avatarUrl: pilot?.avatar_url || (pilot?.pilot_id ? getAvatarUrl(pilot.pilot_id) : '')
                };
            }));

            return NextResponse.json({ pilots: leaderboard });
        }

        if (type === 'credits') {
            const pilots = await PilotModel.find({ status: 'Active', balance: { $gt: 0 }, ...HIDDEN_PILOTS })
                .select('pilot_id first_name last_name total_hours total_flights balance rank avatar_url')
                .sort({ balance: -1 })
                .limit(20)
                .lean();

            const leaderboard = pilots.map((pilot, index) => ({
                rank: index + 1,
                pilotId: pilot.pilot_id,
                name: `${pilot.first_name} ${pilot.last_name}`,
                hours: pilot.total_hours || 0,
                flights: pilot.total_flights || 0,
                credits: pilot.balance || 0,
                pilotRank: pilot.rank || 'Cadet',
                avatarUrl: pilot.avatar_url || getAvatarUrl(pilot.pilot_id),
                isCredits: true
            }));

            return NextResponse.json({ pilots: leaderboard });
        }

        if (type === 'landing') {
            const pilots = await PilotModel.find({ status: 'Active', total_flights: { $gte: 5 }, ...HIDDEN_PILOTS })
                .select('pilot_id first_name last_name total_flights landing_avg rank avatar_url')
                .sort({ landing_avg: -1 })
                .limit(10)
                .lean();

            const leaderboard = pilots.map((pilot, index) => ({
                rank: index + 1,
                pilotId: pilot.pilot_id,
                name: `${pilot.first_name} ${pilot.last_name}`,
                hours: pilot.landing_avg || 0, // Using hours field for value display in UI
                flights: pilot.total_flights || 0,
                pilotRank: pilot.rank || 'Cadet',
                avatarUrl: pilot.avatar_url || getAvatarUrl(pilot.pilot_id),
                isLanding: true
            }));

            return NextResponse.json({ pilots: leaderboard });
        }

        return NextResponse.json({ pilots: [] });
    } catch (error: any) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ pilots: [] });
    }
}
