import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import StaffRole from '@/models/StaffRole';

// PUT: Update role
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const role = await StaffRole.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json({ success: true, role });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Remove role
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    try {
        await StaffRole.findByIdAndDelete(id);
        // Optional: Remove all members with this role? Or reassign? 
        // For now, let's keep it simple.
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
