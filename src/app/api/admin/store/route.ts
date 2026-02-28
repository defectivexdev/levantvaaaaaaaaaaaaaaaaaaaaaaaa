import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreItem from '@/models/StoreItem';
import { PilotModel } from '@/models';

// Middleware-like check for admin
async function checkAdmin(sessionId: string) {
    const pilot = await PilotModel.findById(sessionId);
    return pilot?.is_admin === true;
}

// GET - List all items for management
export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!await checkAdmin(session.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const items = await StoreItem.find().sort({ created_at: -1 });
        return NextResponse.json({ items });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new item
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!await checkAdmin(session.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = await request.json();
        const item = await StoreItem.create(data);
        
        return NextResponse.json({ success: true, item });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update item
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!await checkAdmin(session.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id, ...updates } = await request.json();
        const item = await StoreItem.findByIdAndUpdate(id, updates, { new: true });
        
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, item });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove item
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!await checkAdmin(session.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const item = await StoreItem.findByIdAndDelete(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
