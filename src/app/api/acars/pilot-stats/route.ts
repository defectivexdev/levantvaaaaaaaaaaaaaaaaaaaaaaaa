import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Flight from '@/models/Flight';
import Bid from '@/models/Bid';
import { findPilot, corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId') || '';

        if (!pilotId) {
            return NextResponse.json({ error: 'pilotId required' }, { status: 400, headers: corsHeaders() });
        }

        const pilot = await findPilot(pilotId);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });
        }

        const recentFlights = await Flight.find({ pilot_id: pilot._id })
            .sort({ submitted_at: -1 })
            .limit(10)
            .select('flight_number callsign departure_icao arrival_icao aircraft_type flight_time landing_rate landing_grade score distance submitted_at approved_status')
            .lean();

        const totalFlights = await Flight.countDocuments({ pilot_id: pilot._id, approved_status: { $ne: 2 } });

        let activeBid = await Bid.findOne({ pilot_id: pilot._id, status: 'Active' }).sort({ created_at: -1 }).lean();
        if (!activeBid) activeBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: 'Active' }).sort({ created_at: -1 }).lean();

        return NextResponse.json({
            success: true,
            pilot: {
                pilotId: pilot.pilot_id,
                name: `${pilot.first_name} ${pilot.last_name}`,
                rank: pilot.rank,
                totalHours: pilot.total_hours,
                xp: pilot.xp || 0,
                totalFlights,
                avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ''}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`,
            },
            recentFlights: recentFlights.map((f: any) => ({
                flightNumber: f.flight_number,
                callsign: f.callsign,
                departureIcao: f.departure_icao,
                arrivalIcao: f.arrival_icao,
                aircraftType: f.aircraft_type,
                flightTime: f.flight_time,
                landingRate: f.landing_rate,
                landingGrade: f.landing_grade,
                score: f.score,
                distance: f.distance,
                submittedAt: f.submitted_at,
                status: f.approved_status === 1 ? 'Approved' : f.approved_status === 2 ? 'Rejected' : 'Pending',
            })),
            activeBid: activeBid ? {
                callsign: (activeBid as any).callsign,
                departureIcao: (activeBid as any).departure_icao,
                arrivalIcao: (activeBid as any).arrival_icao,
                aircraftType: (activeBid as any).aircraft_type,
                route: (activeBid as any).route,
            } : null,
        }, { headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS PilotStats]', error);
        return NextResponse.json({ error: 'Failed to fetch pilot stats' }, { status: 500, headers: corsHeaders() });
    }
}
