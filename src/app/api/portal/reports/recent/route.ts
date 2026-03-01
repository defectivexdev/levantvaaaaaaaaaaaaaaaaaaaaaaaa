import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { FlightModel } from '@/models';

export async function GET() {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();

        const flights = await FlightModel.find({ approved_status: { $in: [0, 1] } })
            .sort({ submitted_at: -1 })
            .limit(10)
            .populate('pilot_id', 'first_name last_name pilot_id')
            .lean();

        const formattedReports = flights.map((f: any) => ({
            ...f,
            pilot: f.pilot_id || { first_name: 'Unknown', last_name: 'Pilot', pilot_id: 'N/A' },
            id: `PIREP-${(f._id?.toString() || '').slice(-6).toUpperCase()}`,
            route: `${f.departure_icao} → ${f.arrival_icao}`,
            aircraft: f.aircraft_type,
            date: new Date(f.submitted_at).toLocaleDateString(),
            status: f.approved_status === 1 ? 'Accepted' : f.approved_status === 2 ? 'Rejected' : 'Pending',
            approved_status: f.approved_status,
            log: f.log
        }));

        return NextResponse.json({ flights: formattedReports, reports: formattedReports });

    } catch (error: any) {
        console.error('Recent reports API Error:', error);
        return NextResponse.json({ reports: [] });
    }
}
