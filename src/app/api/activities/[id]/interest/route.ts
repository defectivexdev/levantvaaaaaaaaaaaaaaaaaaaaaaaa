import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import ActivityInterest from '@/models/ActivityInterest';
import { verifyAuth } from '@/lib/auth';

// GET /api/activities/[id]/interest - Get all interested pilots
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const interests = await ActivityInterest.find({ activity_id: id })
            .populate('pilot_id', 'firstName lastName pilotId profileImage callsign')
            .lean();
        
        return NextResponse.json(interests.map((i: any) => ({
            _id: i.id.toString(),
            pilot: i.pilot_id,
            created_at: i.created_at
        })));
    } catch (error: any) {
        console.error('Error fetching interests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch interests' },
            { status: 500 }
        );
    }
}

// POST /api/activities/[id]/interest - Show interest in event
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        // Check if already interested
        const existing = await ActivityInterest.findOne({
            activity_id: id,
            pilot_id: session.id
        });
        
        if (existing) {
            return NextResponse.json({ success: true, alreadyInterested: true });
        }
        
        await ActivityInterest.create({
            activity_id: id,
            pilot_id: session.id
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error adding interest:', error);
        return NextResponse.json(
            { error: 'Failed to add interest' },
            { status: 500 }
        );
    }
}

// DELETE /api/activities/[id]/interest - Remove interest
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        await ActivityInterest.deleteOne({
            activity_id: id,
            pilot_id: session.id
        });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error removing interest:', error);
        return NextResponse.json(
            { error: 'Failed to remove interest' },
            { status: 500 }
        );
    }
}
