import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { FlightModel } from '@/models';
import { verifyAuth } from '@/lib/auth';

// GET /api/portal/history?search=&aircraft=&from=&to=&grade=&status=&page=1&limit=25
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim() || '';
        const aircraft = searchParams.get('aircraft')?.trim() || '';
        const dateFrom = searchParams.get('from') || '';
        const dateTo = searchParams.get('to') || '';
        const grade = searchParams.get('grade') || '';
        const status = searchParams.get('status') || '';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));

        const query: any = { pilot_id: session.id };

        // Text search: flight number, callsign, departure/arrival ICAO
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { flight_number: regex },
                { callsign: regex },
                { departure_icao: regex },
                { arrival_icao: regex },
                { route: regex },
            ];
        }

        // Aircraft type filter (tail number / type code)
        if (aircraft) {
            query.aircraft_type = new RegExp(aircraft, 'i');
        }

        // Date range filter
        if (dateFrom || dateTo) {
            query.submitted_at = {};
            if (dateFrom) query.submitted_at.$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                query.submitted_at.$lte = end;
            }
        }

        // Landing grade filter
        if (grade) {
            switch (grade) {
                case 'butter':
                    query.landing_rate = { $gte: -60, $lte: 0 }; break;
                case 'smooth':
                    query.landing_rate = { $gte: -150, $lt: -60 }; break;
                case 'acceptable':
                    query.landing_rate = { $gte: -300, $lt: -150 }; break;
                case 'firm':
                    query.landing_rate = { $gte: -500, $lt: -300 }; break;
                case 'hard':
                    query.landing_rate = { $lt: -500 }; break;
            }
        }

        // Status filter
        if (status) {
            query.approved_status = parseInt(status);
        }

        const total = await FlightModel.countDocuments(query);
        const flights = await FlightModel.find(query)
            .sort({ submitted_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return NextResponse.json({
            flights,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error: any) {
        console.error('Error fetching flight history:', error);
        return NextResponse.json({ error: 'Failed to fetch flight history' }, { status: 500 });
    }
}
