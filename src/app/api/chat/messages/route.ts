import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ChatMessage from '@/models/ChatMessage';
import Pilot from '@/models/Pilot';

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET /api/chat/messages — fetch recent chat messages
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const before = searchParams.get('before'); // cursor-based pagination

        const query: any = { deleted: false };
        if (before) {
            query.created_at = { $lt: new Date(before) };
        }

        const messages = await ChatMessage.find(query)
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, messages: messages.reverse() }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('Chat fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
    }
}

// POST /api/chat/messages — send a new chat message
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { pilotId, content } = await request.json();

        if (!pilotId || !content?.trim()) {
            return NextResponse.json({ error: 'Missing pilotId or content' }, { status: 400, headers: corsHeaders() });
        }

        if (content.trim().length > 500) {
            return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400, headers: corsHeaders() });
        }

        const pilot = await Pilot.findOne({ pilot_id: pilotId }).select('first_name last_name rank').lean();
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });
        }

        const message = await ChatMessage.create({
            pilot_id: pilotId,
            pilot_name: `${(pilot as any).first_name} ${(pilot as any).last_name}`,
            pilot_rank: (pilot as any).rank || 'Cadet',
            content: content.trim(),
        });

        return NextResponse.json({ success: true, message }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('Chat post error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
    }
}
