
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import StaffRole from '@/models/StaffRole';

// GET: List all roles
export async function GET() {
    await dbConnect();
    try {
        const roles = await StaffRole.find({}).sort({ order: 1 });
        return NextResponse.json({ success: true, roles });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create a new role
export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const maxOrder = await StaffRole.findOne().sort('-order');
        const nextOrder = (maxOrder?.order || 0) + 1;
        
        const role = await StaffRole.create({ 
            ...body, 
            category: body.category || 'Board of Governor',
            order: body.order || nextOrder 
        });
        
        return NextResponse.json({ success: true, role });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
