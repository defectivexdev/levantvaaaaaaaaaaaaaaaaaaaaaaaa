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

        const flights = await FlightModel.find({ pilot_id: session.id })
            .sort({ submitted_at: -1 })
            .limit(10)
            .lean();

        const formattedReports = flights.map((f: any) => ({
            ...f,
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
