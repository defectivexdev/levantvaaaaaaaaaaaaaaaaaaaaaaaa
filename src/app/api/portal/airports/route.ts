import { NextRequest, NextResponse } from 'next/server';
import { searchAirports } from '@/lib/airports';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        await verifyAuth();
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        
        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const results = searchAirports(query);
        return NextResponse.json({ results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
