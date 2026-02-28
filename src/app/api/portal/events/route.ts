import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Event from '@/models/Event';
import EventBooking from '@/models/EventBooking';

export async function GET() {
    try {
        await connectDB();
        
        // Active events only, sorted by start time
        const now = new Date();
        now.setDate(now.getDate() - 1); // Show events from yesterday onwards

        const events = await Event.find({
            is_active: true,
            $or: [
                { end_time: { $gte: now } },
                { end_datetime: { $gte: now } },
                { end_time: { $exists: false } },
                { end_datetime: { $exists: false } },
            ],
        }).sort({ start_time: 1, start_datetime: 1 });

        // If authenticated, enrich with booking status
        const session = await verifyAuth().catch(() => null);
        if (session) {
            const bookings = await EventBooking.find({ 
                pilot_id: session.id,
                event_id: { $in: events.map(e => e.id) }
            });

            const enrichedEvents = events.map(event => {
                const booking = bookings.find(b => b.event_id.toString() === event.id.toString());
                return {
                    ...event.toObject(),
                    booking_status: booking ? booking.status : null,
                    booking_id: booking ? booking.id : null
                };
            });

            return NextResponse.json({ events: enrichedEvents });
        }

        // Public access — return events without booking info
        return NextResponse.json({ events: events.map(e => e.toObject()) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
