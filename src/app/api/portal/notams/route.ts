import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Notam from '@/models/Notam';

export async function GET() {
    try {
        await connectDB();
        
        // Fetch active NOTAMs sorted by date
        const notams = await Notam.find({ is_active: true })
            .sort({ created_at: -1 })
            .limit(10)
            .lean();
            
        return NextResponse.json({ 
            success: true, 
            notams 
        });
    } catch (error) {
        console.error('Failed to fetch NOTAMs:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch company updates' 
        }, { status: 500 });
    }
}
