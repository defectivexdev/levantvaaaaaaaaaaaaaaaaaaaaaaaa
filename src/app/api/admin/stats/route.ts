import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import { FlightModel } from '@/models';
import { ActiveFlightModel } from '@/models';
import AirlineFinance from '@/models/AirlineFinance';

export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const totalPilots = await PilotModel.countDocuments();
        const activeFlights = await ActiveFlightModel.countDocuments();
        const totalFlights = await FlightModel.countDocuments();
        const pendingPireps = await FlightModel.countDocuments({ approved_status: 0 });
        
        const finance = await AirlineFinance.findOne();
        const airlineBalance = finance ? finance.balance : 0;

        return NextResponse.json({
            stats: {
                totalPilots,
                activeFlights,
                totalFlights,
                pendingPireps,
                airlineBalance
            }
        });
    } catch (error: any) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
