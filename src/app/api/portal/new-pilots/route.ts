import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import { unstable_cache } from 'next/cache';

const getNewestPilots = unstable_cache(
    async () => {
        await connectDB();
        const pilots = await PilotModel.find({ pilot_id: { $nin: ['LVT0000'] }, first_name: { $ne: 'Admin' } })
            .sort({ created_at: -1 })
            .limit(5)
            .select('pilot_id first_name last_name created_at rank')
            .lean();
        
        return pilots.map(pilot => ({
            _id: pilot._id,
            pilot_id: pilot.pilot_id,
            first_name: pilot.first_name,
            last_name: pilot.last_name,
            created_at: pilot.created_at,
            rank: pilot.rank,
        }));
    },
    ['newest-pilots'],
    { revalidate: 10 } // Cache for 10 seconds
);

export async function GET() {
    try {
        const formattedPilots = await getNewestPilots();
        return NextResponse.json({ pilots: formattedPilots });
    } catch (error) {
        console.error('New pilots API Error:', error);
        return NextResponse.json({ pilots: [] });
    }
}
