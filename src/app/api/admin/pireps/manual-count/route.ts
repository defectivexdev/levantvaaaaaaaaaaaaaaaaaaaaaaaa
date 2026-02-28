import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { FlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';

// GET /api/admin/pireps/manual-count — Count pending manual PIREPs for sidebar badge
export async function GET() {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ count: 0 });
    }
    try {
        await dbConnect();
        const count = await FlightModel.countDocuments({
            approved_status: 0,
            is_manual: true,
        });
        return NextResponse.json({ count });
    } catch {
        return NextResponse.json({ count: 0 });
    }
}
