import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Event from '@/models/Event';
import Pilot from '@/models/Pilot';
import EventBooking from '@/models/EventBooking';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { id } = await params;
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const event = await Event.findByIdAndUpdate(id, body, { new: true });
        
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        return NextResponse.json({ success: true, event });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { id } = await params;
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await Event.findByIdAndDelete(id);
        await EventBooking.deleteMany({ event_id: id }); // Clean up bookings

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
