import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Event from '@/models/Event';
import Pilot from '@/models/Pilot';

export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const events = await Event.find().sort({ start_time: -1 });
        return NextResponse.json({ events });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        
        // Basic Validation
        if (!body.title || !body.start_time || !body.end_time) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const event = await Event.create({
            ...body,
            created_by: session.id
        });

        return NextResponse.json({ success: true, event });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
