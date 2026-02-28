import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import ChatMessage from '@/models/ChatMessage';

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

// PUT /api/chat/messages/[id] — edit a message
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { pilotId, content } = await request.json();
        const { id } = await params;

        if (!pilotId || !content?.trim()) {
            return NextResponse.json({ error: 'Missing pilotId or content' }, { status: 400, headers: corsHeaders() });
        }

        const message = await ChatMessage.findById(id);
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404, headers: corsHeaders() });
        }

        if (message.pilot_id !== pilotId) {
            return NextResponse.json({ error: 'Not authorized to edit this message' }, { status: 403, headers: corsHeaders() });
        }

        message.content = content.trim();
        message.edited = true;
        await message.save();

        return NextResponse.json({ success: true, message }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('Chat edit error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
    }
}

// DELETE /api/chat/messages/[id] — delete a message
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { pilotId } = await request.json();
        const { id } = await params;

        if (!pilotId) {
            return NextResponse.json({ error: 'Missing pilotId' }, { status: 400, headers: corsHeaders() });
        }

        const message = await ChatMessage.findById(id);
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404, headers: corsHeaders() });
        }

        if (message.pilot_id !== pilotId) {
            return NextResponse.json({ error: 'Not authorized to delete this message' }, { status: 403, headers: corsHeaders() });
        }

        await ChatMessage.findByIdAndDelete(id);

        return NextResponse.json({ success: true }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('Chat delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
    }
}
