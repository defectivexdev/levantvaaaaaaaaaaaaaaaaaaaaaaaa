import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Event from '@/models/Event';
import EventBooking from '@/models/EventBooking';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const { id } = await params;
        await connectDB();

        const event = await Event.findById(id);
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        if (!event.is_active) return NextResponse.json({ error: 'Event is closed' }, { status: 400 });

        // Check if already booked
        const existing = await EventBooking.findOne({
            pilot_id: session.id,
            event_id: event.id
        });

        if (existing) {
            return NextResponse.json({ error: 'Already booked' }, { status: 400 });
        }

        // Check slots
        if (event.slots_available > 0) {
            const currentBookings = await EventBooking.countDocuments({ event_id: event.id, status: 'booked' });
            if (currentBookings >= event.slots_available) {
                return NextResponse.json({ error: 'Event is full' }, { status: 400 });
            }
        }

        const body = await request.json();

        const booking = await EventBooking.create({
            pilot_id: session.id,
            event_id: event.id,
            status: 'booked',
            callsign: body.callsign,
            route: body.route,
            gate: body.gate,
            slot_time: body.slot_time // Can be null
        });

        return NextResponse.json({ success: true, booking });

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

        await EventBooking.findOneAndDelete({
            pilot_id: session.id,
            event_id: id
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
