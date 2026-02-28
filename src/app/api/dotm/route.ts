import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import DestinationOfTheMonth from '@/models/DestinationOfTheMonth';
import { unstable_cache } from 'next/cache';

const getActiveDotm = unstable_cache(
    async () => {
        await connectDB();
        return await DestinationOfTheMonth.findOne({ is_active: true }).sort({ updated_at: -1 });
    },
    ['active-dotm'],
    { revalidate: 3600 } // Cache for 1 hour
);

export async function GET() {
    try {
        const activeDotm = await getActiveDotm();
        
        if (!activeDotm) {
            return NextResponse.json({ dotm: null });
        }

        return NextResponse.json({ dotm: activeDotm });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch active DOTM' }, { status: 500 });
    }
}
