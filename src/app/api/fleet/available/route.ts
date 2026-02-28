import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Fleet from '@/models/Fleet';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const location = searchParams.get('location');
        const type = searchParams.get('type');

        const query: any = { 
            status: 'Available' 
        };

        if (location) query.current_location = location;
        if (type) query.aircraft_type = type;

        const aircraft = await Fleet.find(query).sort({ condition: -1 });

        return NextResponse.json({ success: true, aircraft });

    } catch (error: any) {
        console.error('Fleet fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch available aircraft' }, { status: 500 });
    }
}
