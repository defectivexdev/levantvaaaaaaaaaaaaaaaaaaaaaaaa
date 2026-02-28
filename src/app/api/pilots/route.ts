import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import Flight from '@/models/Flight';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pilotId = searchParams.get('id') || searchParams.get('pilotId');

    try {
        await connectDB();

        if (pilotId) {
            // Try lookup by pilot_id first (exact match)
            let pilot: any = await Pilot.findOne({ pilot_id: pilotId }).select('-password').lean();

            // Fallback: try common prefix migrations (LVT)
            if (!pilot) {
                const prefixes = ['LVT'];
                for (const prefix of prefixes) {
                    if (pilotId.startsWith(prefix)) {
                        const numPart = pilotId.slice(prefix.length);
                        for (const tryPrefix of prefixes) {
                            if (tryPrefix !== prefix) {
                                pilot = await Pilot.findOne({ pilot_id: tryPrefix + numPart }).select('-password').lean();
                                if (pilot) break;
                            }
                        }
                        if (pilot) break;
                    }
                }
            }

            // If not found and pilotId looks like an ObjectId, try lookup by _id
            if (!pilot && pilotId.match(/^[0-9a-fA-F]{24}$/)) {
                pilot = await Pilot.findById(pilotId).select('-password').lean();
            }

            if (pilot) {
                // Get flight stats (landing average) via lightweight aggregate
                const [landingStats] = await Flight.aggregate([
                    { $match: { pilot_id: pilot._id, landing_rate: { $exists: true, $ne: null } } },
                    { $group: { _id: null, avg: { $avg: '$landing_rate' }, count: { $sum: 1 } } }
                ]);
                const totalLandingRate = landingStats?.avg || 0;
                const count = landingStats?.count || 0;

                return NextResponse.json({
                    pilot: {
                        id: (pilot._id || pilot.id)?.toString(),
                        pilot_id: pilot.pilot_id,
                        first_name: pilot.first_name,
                        last_name: pilot.last_name,
                        email: pilot.email,
                        phone_number: pilot.phone_number,
                        rank: pilot.rank,
                        status: pilot.status,
                        role: pilot.role,
                        total_hours: pilot.total_hours,
                        transfer_hours: pilot.transfer_hours || 0,
                        total_flights: pilot.total_flights,
                        total_credits: pilot.total_credits,
                        current_location: pilot.current_location,
                        country: pilot.country,
                        city: pilot.city,
                        timezone: pilot.timezone,
                        vatsim_cid: pilot.vatsim_cid || '',
                        ivao_vid: pilot.ivao_vid || '',
                        desired_callsign: pilot.desired_callsign,
                        created_at: pilot.created_at,
                        balance: pilot.balance || 0,
                        hoppie_code: pilot.hoppie_code || '',
                        sim_mode: pilot.sim_mode || 'fsuipc',
                        routes_flown: pilot.routes_flown || [],
                        // avatar_url is now derived from pilot_id via Cloudinary, not stored in DB
                        average_landing: count > 0 ? Math.round(totalLandingRate / count) : 0
                    }
                });
            }
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        return NextResponse.json({ pilots: [] });
    } catch (error) {
        console.error('Error fetching pilot:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const data = await request.json();
        const { pilotId, updates } = data;

        if (!pilotId) return NextResponse.json({ error: 'Pilot ID required' }, { status: 400 });

        // Find the pilot
        const pilot = await Pilot.findOne({ pilot_id: pilotId });
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // avatar_url is no longer stored in DB - avatars are managed via Cloudinary with predictable URLs
        const allowedFields = ['country', 'timezone', 'vatsim_id', 'simbrief_id', 'email_opt_in', 'city', 'phone_number', 'hoppie_code', 'sim_mode'];
        const cleanUpdates: any = {};

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                cleanUpdates[key] = value;
            }
        }

        if (Object.keys(cleanUpdates).length > 0) {
            await Pilot.findByIdAndUpdate(pilot.id, cleanUpdates);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update pilot: ' + error.message }, { status: 500 });
    }
}
