import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import StoreItem from '@/models/StoreItem';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await connectDB();

        const items = await StoreItem.find({ active: true, category: { $ne: 'Skin' } }).sort({ price: 1 }).lean();

        return NextResponse.json({ success: true, items });

    } catch (error) {
        console.error('Error fetching store items:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
