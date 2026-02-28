import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { FlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';

// GET /api/portal/history/export?format=csv
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const flights = await FlightModel.find({ pilot_id: session.id })
            .sort({ submitted_at: -1 })
            .lean();

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'csv';

        if (format === 'csv') {
            const headers = [
                'Date', 'Flight Number', 'Callsign', 'Departure', 'Arrival',
                'Aircraft', 'Flight Time (min)', 'Distance (nm)', 'Landing Rate (fpm)',
                'Score', 'Credits Earned', 'Status'
            ];

            const statusLabel = (s: number) =>
                s === 1 ? 'Approved' : s === 2 ? 'Rejected' : 'Pending';

            const escapeCsv = (val: string | number | undefined) => {
                const str = String(val ?? '');
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            };

            const rows = flights.map((f: any) => [
                f.submitted_at ? new Date(f.submitted_at).toISOString().split('T')[0] : '',
                f.flight_number || '',
                f.callsign || '',
                f.departure_icao || '',
                f.arrival_icao || '',
                f.aircraft_type || '',
                f.flight_time || 0,
                Math.round(f.distance || 0),
                f.landing_rate || 0,
                f.score || 0,
                f.credits_earned || 0,
                statusLabel(f.approved_status),
            ].map(escapeCsv).join(','));

            const csv = [headers.join(','), ...rows].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="logbook_${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
