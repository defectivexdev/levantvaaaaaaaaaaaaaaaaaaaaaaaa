import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/database';
import Bid from '@/models/Bid';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('lva_session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secret);

        const body = await request.json();
        const { bidId } = body;

        await connectDB();

        const userId = payload.id; 
        
        let result;

        if (bidId) {
            // Cancel specific bid (verify ownership)
            result = await Bid.findOneAndUpdate(
                { _id: bidId, pilot_id: userId, status: 'Active' },
                { status: 'Cancelled' }
            );
        } else {
             // Cancel all active bids for this pilot
             result = await Bid.updateMany(
                 { pilot_id: userId, status: 'Active' },
                 { status: 'Cancelled' }
            );
        }

        if (result) {
            return NextResponse.json({ success: true, message: 'Booking cancelled' });
        } else {
             return NextResponse.json({ success: true, message: 'No active booking found or already cancelled' });
        }

    } catch (error: any) {
        console.error('Cancel booking error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel booking' },
            { status: 500 }
        );
    }
}
