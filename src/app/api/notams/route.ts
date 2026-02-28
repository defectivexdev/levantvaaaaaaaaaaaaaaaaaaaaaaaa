import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Notam from '@/models/Notam';

// GET - Fetch all active NOTAMs/News
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        
        const query: any = { active: true };
        if (type) query.type = type;
        
        const notams = await Notam.find(query)
            .sort({ priority: -1, created_at: -1 })
            .limit(50);

        return NextResponse.json({ notams });
    } catch (error: any) {
        console.error('Fetch NOTAMs error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
