import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { FlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';

// GET /api/portal/history/[id]
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const flight = await FlightModel.findById(id).lean();

        if (!flight) {
            return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
        }

        // Ensure the flight belongs to the requesting pilot
        // Use loose equality or string conversion to handle ObjectId vs String mismatch
        if (flight.pilot_id?.toString() !== session.pilotId) {
             return NextResponse.json({ error: 'Unauthorized access to this flight' }, { status: 403 });
        }

        return NextResponse.json({ flight: flight });
    } catch (error: any) {
        console.error('Error fetching flight details:', error);
        return NextResponse.json({ error: 'Failed to fetch flight details' }, { status: 500 });
    }
}
