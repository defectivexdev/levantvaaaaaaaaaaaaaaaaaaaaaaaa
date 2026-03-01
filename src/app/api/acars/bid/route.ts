import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Bid from '@/models/Bid';
import Fleet from '@/models/Fleet';
import ActiveFlight from '@/models/ActiveFlight';
import Airport from '@/models/Airport';
import { findPilot, getConfig, corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { action, pilotId } = body;

        if (action === 'cancel-bid') return handleCancelBid(pilotId);
        if (action === 'book') return handleBookFlight(body);
        return handleGetBid(pilotId);
    } catch (error: any) {
        console.error('[ACARS Bid]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders() });
    }
}

async function handleGetBid(pilotId: string) {
    const pilot = await findPilot(pilotId);
    if (!pilot) {
        console.warn(`[ACARS getBid] Pilot not found: "${pilotId}"`);
        return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });
    }

    let bid = await Bid.findOne({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } }).sort({ created_at: -1 });
    if (!bid) bid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: { $in: ['Active', 'InProgress'] } }).sort({ created_at: -1 });

    if (!bid) {
        const allBids = await Bid.find({
            $or: [{ pilot_id: pilot._id }, { pilot_id: pilot._id.toString() }]
        }).select('pilot_id status callsign created_at expires_at').sort({ created_at: -1 }).limit(5).lean();
        console.warn(`[ACARS getBid] No active bid for ${pilot.pilot_id}. Recent:`, allBids.map(b => ({ status: b.status, callsign: b.callsign })));
        return NextResponse.json({ bid: null }, { headers: corsHeaders() });
    }

    const [depAirport, arrAirport] = await Promise.all([
        Airport.findOne({ icao: bid.departure_icao }).select('name latitude longitude').lean(),
        Airport.findOne({ icao: bid.arrival_icao }).select('name latitude longitude').lean(),
    ]);

    let ofpBriefing: any = null;
    if (pilot.simbrief_id) {
        try {
            const sbRes = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?userid=${pilot.simbrief_id}&json=v2`, { cache: 'no-store' });
            if (sbRes.ok) {
                const sbData = await sbRes.json();
                if (sbData?.fetch?.status === 'Success') {
                    ofpBriefing = {
                        route: sbData.general?.route || bid.route,
                        cruise_altitude: sbData.general?.initial_altitude || '',
                        cost_index: sbData.general?.costindex || '',
                        distance_nm: sbData.general?.route_distance || '',
                        fuel_block: sbData.fuel?.plan_ramp || 0,
                        fuel_taxi: sbData.fuel?.taxi || 0,
                        fuel_enroute: sbData.fuel?.enroute_burn || 0,
                        fuel_reserve: sbData.fuel?.reserve || 0,
                        fuel_alternate: sbData.fuel?.alternate_burn || 0,
                        fuel_contingency: sbData.fuel?.contingency || 0,
                        est_time_enroute: sbData.times?.est_time_enroute || '',
                        est_out: sbData.times?.est_out || '',
                        est_in: sbData.times?.est_in || '',
                        pax_count: sbData.weights?.pax_count || 0,
                        cargo_weight: sbData.weights?.cargo || 0,
                        zfw: sbData.weights?.est_zfw || 0,
                        tow: sbData.weights?.est_tow || 0,
                        ldw: sbData.weights?.est_ldw || 0,
                        alternate_icao: sbData.alternate?.icao_code || '',
                        alternate_name: sbData.alternate?.name || '',
                        origin_metar: sbData.weather?.orig_metar || '',
                        dest_metar: sbData.weather?.dest_metar || '',
                        altn_metar: sbData.weather?.altn_metar || '',
                        v_speeds: {
                            v1: sbData.takeoff?.v1 || 0,
                            vr: sbData.takeoff?.v_r || sbData.v_speeds?.v_r || 0,
                            v2: sbData.takeoff?.v2 || 0,
                            vref: sbData.approach?.vref || sbData.v_speeds?.v_ref || 0,
                            vapp: sbData.approach?.vapp || sbData.v_speeds?.v_app || 0,
                        },
                        aircraft_name: sbData.aircraft?.name || '',
                        aircraft_icao: sbData.aircraft?.icao_code || '',
                    };
                }
            }
        } catch (sbErr) {
            console.error('SimBrief auto-fetch failed (non-fatal):', sbErr);
        }
    }

    return NextResponse.json({
        success: true,
        bid: {
            id: bid.id,
            flight_number: bid.callsign,
            airline_code: 'LVT',
            callsign: bid.callsign,
            departure_icao: bid.departure_icao,
            arrival_icao: bid.arrival_icao,
            departure_name: (depAirport as any)?.name || '',
            arrival_name: (arrAirport as any)?.name || '',
            dep_lat: (depAirport as any)?.latitude || 0,
            dep_lon: (depAirport as any)?.longitude || 0,
            arr_lat: (arrAirport as any)?.latitude || 0,
            arr_lon: (arrAirport as any)?.longitude || 0,
            aircraft_type: bid.aircraft_type,
            aircraft_registration: bid.aircraft_registration,
            simbrief_ofp_id: bid.simbrief_ofp_id,
            planned_fuel: bid.planned_fuel,
            rotation_speed: bid.rotation_speed,
            planned_route: bid.route,
            activity_id: bid.activity_id,
            pax: bid.pax,
            cargo: bid.cargo,
            status: 'Active',
            created_at: bid.created_at,
            expires_at: bid.expires_at,
        },
        ofp: ofpBriefing,
    }, { headers: corsHeaders() });
}

async function handleCancelBid(pilotId: string) {
    const pilot = await findPilot(pilotId);
    if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });

    const bidsToCancel = await Bid.find({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
    for (const bid of bidsToCancel) {
        if (bid.aircraft_registration) {
            await Fleet.updateOne(
                { registration: bid.aircraft_registration, status: 'InFlight' },
                { $set: { status: 'Available' } }
            );
        }
    }

    const result = await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
    await ActiveFlight.deleteMany({ pilot_id: pilot._id });

    return NextResponse.json({ success: true, cancelled: result.deletedCount || 0 }, { headers: corsHeaders() });
}

async function handleBookFlight(params: any) {
    const {
        pilotId, callsign, departure_icao, arrival_icao, aircraft_type,
        aircraft_registration, route, estimated_flight_time, pax, cargo,
        simbrief_ofp_id, activity_id
    } = params;

    const pilot = await findPilot(pilotId);
    if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });

    // Cancel any existing active bid
    let existingBid = await Bid.findOne({ pilot_id: pilot._id, status: 'Active' });
    if (!existingBid) existingBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: 'Active' });
    if (existingBid) {
        existingBid.status = 'Cancelled';
        await existingBid.save();
    }

    // Aircraft validation
    if (aircraft_registration) {
        const aircraft = await Fleet.findOne({ registration: aircraft_registration });
        if (aircraft) {
            if (aircraft.repair_until && new Date(aircraft.repair_until) > new Date()) {
                const remaining = Math.ceil((new Date(aircraft.repair_until).getTime() - Date.now()) / (1000 * 60 * 60));
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is under repair. Available in ~${remaining}h.` }, { status: 400, headers: corsHeaders() });
            }
            if (aircraft.repair_until && new Date(aircraft.repair_until) <= new Date()) {
                aircraft.status = 'Available';
                aircraft.repair_until = undefined;
                aircraft.grounded_reason = undefined;
                await aircraft.save();
            }
            if (aircraft.status === 'Grounded') {
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is grounded: ${aircraft.grounded_reason || 'maintenance required'}` }, { status: 400, headers: corsHeaders() });
            }
            const config = await getConfig();
            if (config.location_based_fleet && aircraft.current_location !== departure_icao.toUpperCase()) {
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is at ${aircraft.current_location}, not ${departure_icao.toUpperCase()}.` }, { status: 400, headers: corsHeaders() });
            }
        }
    }

    const newBid = await Bid.create({
        pilot_id: pilot._id,
        pilot_name: `${pilot.first_name} ${pilot.last_name}`,
        callsign,
        departure_icao: departure_icao.toUpperCase(),
        arrival_icao: arrival_icao.toUpperCase(),
        aircraft_type, aircraft_registration, route,
        estimated_flight_time, pax, cargo, simbrief_ofp_id, activity_id,
        status: 'Active',
    });

    return NextResponse.json({ success: true, bid: newBid }, { headers: corsHeaders() });
}
