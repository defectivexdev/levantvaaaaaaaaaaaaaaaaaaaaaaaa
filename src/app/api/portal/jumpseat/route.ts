import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import { getAirportByICAO } from '@/lib/airports';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();

        const { destinationIcao } = await request.json();
        
        const airport = getAirportByICAO(destinationIcao);
        if (!airport) {
            return NextResponse.json({ error: 'Invalid destination ICAO' }, { status: 400 });
        }
        
        const cost = 1000; // Flat rate as requested

        const pilot = await PilotModel.findById(session.id);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        if (pilot.current_location === destinationIcao) {
            return NextResponse.json({ error: 'You are already at this location' }, { status: 400 });
        }

        if (pilot.balance < cost) {
            return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
        }

        // Process jumpseat
        await PilotModel.findByIdAndUpdate(session.id, {
            $inc: { balance: -cost },
            current_location: destinationIcao,
            last_activity: new Date()
        });

        return NextResponse.json({
            success: true,
            message: `Successfully jumpseated to ${airport.airport} (${destinationIcao})`,
            newLocation: destinationIcao,
            remainingCredits: pilot.balance - cost
        });
    } catch (error: any) {
        console.error('Jumpseat API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
