import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { FlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';

// GET /api/admin/pireps - List all PIREPs with pagination
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status'); // pending, approved, denied
        const search = searchParams.get('search');

        const query: any = {};
        
        // Filter by approval status
        if (status === 'pending') query.approved_status = 0;
        else if (status === 'approved') query.approved_status = 1;
        else if (status === 'denied') query.approved_status = 2;

        // Search by flight number or pilot ID
        if (search) {
            query.$or = [
                { flight_number: { $regex: search, $options: 'i' } },
                { callsign: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        
        const [pireps, total] = await Promise.all([
            FlightModel.find(query)
                .sort({ submitted_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FlightModel.countDocuments(query)
        ]);

        return NextResponse.json({
            pireps,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching PIREPs:', error);
        return NextResponse.json({ error: 'Failed to fetch PIREPs' }, { status: 500 });
    }
}

// DELETE /api/admin/pireps - Delete a PIREP
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing PIREP ID' }, { status: 400 });
        }

        await FlightModel.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting PIREP:', error);
        return NextResponse.json({ error: 'Failed to delete PIREP' }, { status: 500 });
    }
}
