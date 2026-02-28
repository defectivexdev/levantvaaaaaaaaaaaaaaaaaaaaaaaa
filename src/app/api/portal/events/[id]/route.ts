import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Event from '@/models/Event';
import EventBooking from '@/models/EventBooking';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await connectDB();

        const event = await Event.findById(id);
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (!event.is_active) return NextResponse.json({ error: 'Event unavailable' }, { status: 404 });

        const session = await verifyAuth().catch(() => null);
        if (!session) {
            return NextResponse.json({ event: event.toObject(), booking_status: null, booking_id: null });
        }

        const booking = await EventBooking.findOne({ pilot_id: session.id, event_id: event.id });
        return NextResponse.json({
            event: event.toObject(),
            booking_status: booking ? booking.status : null,
            booking_id: booking ? booking.id : null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
