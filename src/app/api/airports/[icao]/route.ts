import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Airport from '@/models/Airport';

// GET /api/airports/[icao] - Get airport details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ icao: string }> }
) {
    try {
        await dbConnect();
        const { icao: rawIcao } = await params;
        
        const icao = rawIcao.toUpperCase();
        
        const airport = await Airport.findOne({ icao }).lean();
        
        if (!airport) {
            return NextResponse.json(
                { error: 'Airport not found' },
                { status: 404 }
            );
        }
        
        // Fetch METAR from external API (AVWX or similar)
        let metar = null;
        try {
            const metarRes = await fetch(
                `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`,
                { next: { revalidate: 300 } } // Cache for 5 minutes
            );
            if (metarRes.ok) {
                const metarData = await metarRes.json();
                if (metarData && metarData.length > 0) {
                    metar = metarData[0];
                }
            }
        } catch (err) {
            console.error('Error fetching METAR:', err);
        }
        
        return NextResponse.json({
            ...(airport as any),
            _id: (airport as any).id.toString(),
            metar,
        });
    } catch (error: any) {
        console.error('Error fetching airport:', error);
        return NextResponse.json(
            { error: 'Failed to fetch airport' },
            { status: 500 }
        );
    }
}
