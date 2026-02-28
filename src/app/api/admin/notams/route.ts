import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notam from '@/models/Notam';
import Pilot from '@/models/Pilot';

// GET - Fetch all NOTAMs for admin
export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const notams = await Notam.find().sort({ created_at: -1 });
        return NextResponse.json({ notams });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new NOTAM
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
        const { title, content, type, priority, eventDate, eventLocation, bonusCredits } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const notam = await Notam.create({
            title,
            content,
            type: type || 'news',
            priority: priority || 'normal',
            author_id: session.id,
            author_name: `${pilot.first_name} ${pilot.last_name}`,
            event_date: eventDate ? new Date(eventDate) : undefined,
            event_location: eventLocation,
            bonus_credits: bonusCredits,
        });

        return NextResponse.json({ success: true, notam });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update NOTAM
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        await Notam.findByIdAndUpdate(id, updates);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete NOTAM
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        await Notam.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
