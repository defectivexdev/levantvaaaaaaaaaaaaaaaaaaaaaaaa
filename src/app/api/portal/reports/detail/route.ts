import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Flight from '@/models/Flight';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        
        // Verify session
        const auth = await verifyAuth();
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing flight ID' }, { status: 400 });
        }

        const report = await Flight.findById(id).lean();
        
        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json({ report });

    } catch (error) {
        console.error('Error fetching report detail:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const auth = await verifyAuth();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, comments, notes } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const report = await Flight.findById(id);
        if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Security: Only owner or admin
        if (report.pilot_id.toString() !== auth.id && !auth.isAdmin) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Only allow editing if pending? (Optional rule)
        // if (report.approved_status !== 0) return NextResponse.json({ error: 'Cannot edit processed PIREP' }, { status: 400 });

        if (comments !== undefined) report.comments = comments;
        
        await report.save();
        return NextResponse.json({ success: true, report });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const auth = await verifyAuth();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const report = await Flight.findById(id);
        if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Security: Only owner or admin
        if (report.pilot_id.toString() !== auth.id && !auth.isAdmin) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await Flight.findByIdAndDelete(id);
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
