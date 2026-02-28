import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Award from '@/models/Award';

// GET /api/awards - List all active awards
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const awards = await Award.find({ active: true })
            .sort({ order: 1, name: 1 })
            .lean();
        
        return NextResponse.json(awards);
    } catch (error: any) {
        console.error('Error fetching awards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch awards' },
            { status: 500 }
        );
    }
}
