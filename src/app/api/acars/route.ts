import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import Flight from '@/models/Flight';
import ActiveFlight from '@/models/ActiveFlight';
import DestinationOfTheMonth from '@/models/DestinationOfTheMonth';
import Fleet from '@/models/Fleet';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';
import Activity from '@/models/Activity';
import ActivityProgress from '@/models/ActivityProgress';
import EventBooking from '@/models/EventBooking';
import Event from '@/models/Event';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { triggerFlightUpdate } from '@/lib/pusher';
import { checkAndUpgradeRank } from '@/lib/ranks';
import { checkAndGrantAwards } from '@/lib/awards';
import PilotAward from '@/models/PilotAward';
import { notifyTakeoff, notifyLanding, notifyModeration, notifyBlacklist } from '@/lib/discord';
import AirlineFinance from '@/models/AirlineFinance';
import FinanceLog from '@/models/FinanceLog';
import GlobalConfig from '@/models/GlobalConfig';
import MaintenanceLog from '@/models/MaintenanceLog';
import Bid from '@/models/Bid';
import Airport from '@/models/Airport';
import { calculateFlightCredits, awardFlightCredits } from '@/lib/xp';
// Helper to find pilot by pilot_id, email, or MongoDB _id
async function findPilot(pilotId: string) {
    // Try exact pilot_id or email first
    let pilot = await Pilot.findOne({
        $or: [
            { pilot_id: pilotId },
            { email: pilotId.toLowerCase() }
        ]
    });
    // Fallback: try case-insensitive pilot_id
    if (!pilot) {
        pilot = await Pilot.findOne({ pilot_id: { $regex: new RegExp(`^${pilotId}$`, 'i') } });
    }
    // Fallback: try as MongoDB ObjectId
    if (!pilot && /^[0-9a-fA-F]{24}$/.test(pilotId)) {
        pilot = await Pilot.findById(pilotId);
    }
    return pilot;
}

// Haversine formula: returns distance in nautical miles between two lat/lng points
function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// In-memory position cache for slew detection (pilotId → last snapshot)
const positionCache = new Map<string, { lat: number; lon: number; ts: number }>();
const SLEW_DISTANCE_NM = 10; // Flag if >10nm in <30s
const SLEW_TIME_MS = 30000;

// CORS helper — allow the C# ACARS client and browsers to call this endpoint
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// Preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET handler for read-only queries (traffic, pilot-stats)
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        let response: NextResponse;
        switch (action) {
            case 'traffic':
                response = await handleTraffic();
                break;
            case 'pilot-stats': {
                const pilotId = searchParams.get('pilotId') || '';
                response = await handlePilotStats(pilotId);
                break;
            }
            default: {
                const [activeFlights, totalFlights, totalPilots] = await Promise.all([
                    ActiveFlight.countDocuments(),
                    Flight.countDocuments(),
                    Pilot.countDocuments(),
                ]);
                const now = new Date().toUTCString();
                const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Levant VA — ACARS API</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0c10;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;padding:40px 20px}
  .container{max-width:860px;margin:0 auto}
  .header{display:flex;align-items:center;gap:16px;margin-bottom:36px}
  .logo{width:48px;height:48px;background:linear-gradient(135deg,#d4af37,#cd7f32);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
  .title{font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px}
  .subtitle{font-size:13px;color:#64748b;margin-top:2px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#0f2718;border:1px solid #166534;color:#4ade80;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.5px}
  .badge::before{content:'';width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
  .stat{background:#111318;border:1px solid #1e2330;border-radius:12px;padding:18px 20px}
  .stat-value{font-size:28px;font-weight:700;color:#d4af37;font-variant-numeric:tabular-nums}
  .stat-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px}
  .section{background:#111318;border:1px solid #1e2330;border-radius:12px;margin-bottom:16px;overflow:hidden}
  .section-header{padding:14px 20px;border-bottom:1px solid #1e2330;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b}
  .endpoint{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:12px 20px;border-bottom:1px solid #0d1117;align-items:start}
  .endpoint:last-child{border-bottom:none}
  .method{font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;font-family:monospace;text-align:center;width:fit-content}
  .method.post{background:#1a1033;color:#a78bfa;border:1px solid #4c1d95}
  .method.get{background:#0c2340;color:#60a5fa;border:1px solid #1e3a5f}
  .ep-path{font-family:monospace;font-size:13px;color:#e2e8f0;font-weight:600;margin-bottom:3px}
  .ep-desc{font-size:12px;color:#64748b}
  .ep-params{font-family:monospace;font-size:11px;color:#475569;margin-top:4px;line-height:1.6}
  .footer{text-align:center;font-size:12px;color:#334155;margin-top:28px}
  @media(max-width:600px){.stats{grid-template-columns:1fr}.endpoint{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">✈</div>
    <div>
      <div class="title">Levant VA — ACARS API</div>
      <div class="subtitle">Aircraft Communications &amp; Reporting System &nbsp;·&nbsp; v1.3.0</div>
    </div>
    <div style="margin-left:auto"><span class="badge">ONLINE</span></div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-value">${activeFlights}</div><div class="stat-label">Active Flights</div></div>
    <div class="stat"><div class="stat-value">${totalPilots}</div><div class="stat-label">Registered Pilots</div></div>
    <div class="stat"><div class="stat-value">${totalFlights}</div><div class="stat-label">Total PIREPs</div></div>
  </div>

  <div class="section">
    <div class="section-header">POST Endpoints &nbsp;·&nbsp; /api/acars</div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "auth"</div><div class="ep-desc">Authenticate pilot and get session token</div><div class="ep-params">{ pilotId, password }</div></div>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "bid"</div><div class="ep-desc">Fetch active flight plan / bid</div><div class="ep-params">{ pilotId }</div></div>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "start"</div><div class="ep-desc">Notify flight departure and create tracking record</div><div class="ep-params">{ sessionToken, pilotId, callsign, departureIcao, arrivalIcao, aircraftType }</div></div>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "position"</div><div class="ep-desc">Send live position update (every ~5s)</div><div class="ep-params">{ sessionToken, pilotId, callsign, latitude, longitude, altitude, heading, groundSpeed, status, phase }</div></div>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "pirep"</div><div class="ep-desc">Submit completed flight report</div><div class="ep-params">{ sessionToken, pilotId, callsign, departureIcao, arrivalIcao, aircraftType, flightTimeMinutes, landingRate, fuelUsed, distanceNm, score, timestamp, signature }</div></div>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <div><div class="ep-path">action: "end"</div><div class="ep-desc">Notify flight ended / cancelled</div><div class="ep-params">{ pilotId, callsign }</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">GET Endpoints &nbsp;·&nbsp; /api/acars?action=</div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <div><div class="ep-path">action=traffic</div><div class="ep-desc">Fetch all active flights for live map</div></div>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <div><div class="ep-path">action=pilot-stats</div><div class="ep-desc">Fetch pilot statistics</div><div class="ep-params">?pilotId=LVT001</div></div>
    </div>
  </div>

  <div class="footer">Levant Virtual Airlines &nbsp;·&nbsp; ${now}</div>
</div>
</body>
</html>`;
                response = new NextResponse(html, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                });
                break;
            }
        }

        Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
        return response;
    } catch (error: any) {
        console.error('ACARS error [GET]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}

// Handle ACARS requests
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const data = await request.json();
        const { action, ...params } = data;

        let response: NextResponse;
        switch (action) {
            case 'auth':
                response = await handleAuth(params); break;
            case 'position':
                response = await handlePosition(params); break;
            case 'bid':
                response = await handleGetBid(params); break;
            case 'pirep':
                response = await handlePirep(params); break;
            case 'start':
                response = await handleFlightStart(params); break;
            case 'book':
                response = await handleBookFlight(params); break;
            case 'cancel-bid':
                response = await handleCancelBid(params); break;
            case 'end':
                response = await handleFlightEnd(params); break;
            case 'aircraft-health':
                response = await handleAircraftHealth(params); break;
            default:
                response = NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Attach CORS headers to every response
        Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
        return response;
    } catch (error: any) {
        console.error('ACARS error [POST]:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500, headers: corsHeaders() });
    }
}

async function handleGetBid(params: { pilotId: string }) {
    const { pilotId } = params;
    
    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            console.warn(`[ACARS getBid] Pilot not found for identifier: "${pilotId}"`);
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        console.log(`[ACARS getBid] Resolved pilot: _id=${pilot._id}, pilot_id=${pilot.pilot_id}, lookup="${pilotId}"`);

        // Primary query: match by ObjectId
        let bid = await Bid.findOne({ 
            pilot_id: pilot._id, 
            status: { $in: ['Active', 'InProgress'] } 
        }).sort({ created_at: -1 });

        // Fallback: try matching by _id as string (handles type mismatch edge case)
        if (!bid) {
            bid = await Bid.findOne({ 
                pilot_id: pilot._id.toString(), 
                status: { $in: ['Active', 'InProgress'] } 
            }).sort({ created_at: -1 });
        }

        if (!bid) {
            // Diagnostic: log ALL bids for this pilot to understand the state
            const allBids = await Bid.find({ 
                $or: [
                    { pilot_id: pilot._id },
                    { pilot_id: pilot._id.toString() }
                ]
            }).select('pilot_id status callsign created_at expires_at').sort({ created_at: -1 }).limit(5).lean();
            console.warn(`[ACARS getBid] No active bid for pilot ${pilot.pilot_id} (_id=${pilot._id}). Recent bids:`, 
                allBids.map(b => ({ id: b._id, pilot_id: b.pilot_id?.toString(), status: b.status, callsign: b.callsign, expires: b.expires_at }))
            );
            return NextResponse.json({ bid: null });
        }

        // Fetch airport details for names and coordinates
        const [depAirport, arrAirport] = await Promise.all([
            Airport.findOne({ icao: bid.departure_icao }).select('name latitude longitude').lean(),
            Airport.findOne({ icao: bid.arrival_icao }).select('name latitude longitude').lean(),
        ]);

        // Auto-fetch SimBrief OFP if pilot has simbrief_id and bid has ofp_id
        let ofpBriefing: any = null;
        const simbriefId = pilot.simbrief_id;
        if (simbriefId) {
            try {
                const sbRes = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?userid=${simbriefId}&json=v2`, { cache: 'no-store' });
                if (sbRes.ok) {
                    const sbData = await sbRes.json();
                    if (sbData?.fetch?.status === 'Success') {
                        ofpBriefing = {
                            route: sbData.general?.route || bid.route,
                            cruise_altitude: sbData.general?.initial_altitude || '',
                            cost_index: sbData.general?.costindex || '',
                            distance_nm: sbData.general?.route_distance || '',
                            // Fuel breakdown
                            fuel_block: sbData.fuel?.plan_ramp || 0,
                            fuel_taxi: sbData.fuel?.taxi || 0,
                            fuel_enroute: sbData.fuel?.enroute_burn || 0,
                            fuel_reserve: sbData.fuel?.reserve || 0,
                            fuel_alternate: sbData.fuel?.alternate_burn || 0,
                            fuel_contingency: sbData.fuel?.contingency || 0,
                            // Times
                            est_time_enroute: sbData.times?.est_time_enroute || '',
                            est_out: sbData.times?.est_out || '',
                            est_in: sbData.times?.est_in || '',
                            // Weights
                            pax_count: sbData.weights?.pax_count || 0,
                            cargo_weight: sbData.weights?.cargo || 0,
                            zfw: sbData.weights?.est_zfw || 0,
                            tow: sbData.weights?.est_tow || 0,
                            ldw: sbData.weights?.est_ldw || 0,
                            // Alternate
                            alternate_icao: sbData.alternate?.icao_code || '',
                            alternate_name: sbData.alternate?.name || '',
                            // Weather
                            origin_metar: sbData.weather?.orig_metar || '',
                            dest_metar: sbData.weather?.dest_metar || '',
                            altn_metar: sbData.weather?.altn_metar || '',
                            // Speeds
                            v_speeds: {
                                v1: sbData.takeoff?.v1 || 0,
                                vr: sbData.takeoff?.v_r || sbData.v_speeds?.v_r || 0,
                                v2: sbData.takeoff?.v2 || 0,
                                vref: sbData.approach?.vref || sbData.v_speeds?.v_ref || 0,
                                vapp: sbData.approach?.vapp || sbData.v_speeds?.v_app || 0,
                            },
                            // Aircraft
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
                departure_name: depAirport?.name || '',
                arrival_name: arrAirport?.name || '',
                dep_lat: depAirport?.latitude || 0,
                dep_lon: depAirport?.longitude || 0,
                arr_lat: arrAirport?.latitude || 0,
                arr_lon: arrAirport?.longitude || 0,
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
        });

    } catch (error) {
        console.error('ACARS Get Bid Error:', error);
        return NextResponse.json({ error: 'Failed to fetch bid' }, { status: 500 });
    }
}

async function handleCancelBid(params: { pilotId: string }) {
    const { pilotId } = params;
    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Find active/in-progress bids to release their aircraft before deleting
        const bidsToCancel = await Bid.find(
            { pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } }
        );

        // Reset only the specific aircraft from these bids
        for (const bid of bidsToCancel) {
            if (bid.aircraft_registration) {
                await Fleet.updateOne(
                    { registration: bid.aircraft_registration, status: 'InFlight' },
                    { $set: { status: 'Available' } }
                );
            }
        }

        const result = await Bid.deleteMany(
            { pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } }
        );

        // Also clean up any active flights for this pilot
        await ActiveFlight.deleteMany({ pilot_id: pilot._id });

        return NextResponse.json({
            success: true,
            cancelled: result.deletedCount || 0,
        });
    } catch (error) {
        console.error('ACARS Cancel Bid Error:', error);
        return NextResponse.json({ error: 'Failed to cancel bid' }, { status: 500 });
    }
}

async function handleAuth(params: { pilotId: string; password: string }) {
    const { pilotId, password } = params;

    if (!pilotId || !password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    try {
        const pilot = await findPilot(pilotId);

        if (pilot) {
            const valid = await bcrypt.compare(password, pilot.password);

            if (valid) {
                const sessionToken = Buffer.from(`${pilotId}:${Date.now()}`).toString('base64');

                // Restore status to Active if LOA or Inactive
                if (pilot.status === 'On leave (LOA)' || pilot.status === 'Inactive') {
                    pilot.status = 'Active';
                    await pilot.save();
                }

                return NextResponse.json({
                    success: true,
                    sessionToken,
                    pilot: {
                        id: pilot.id.toString(),
                        pilotId: pilot.pilot_id,
                        callsign: pilot.desired_callsign || pilot.pilot_id,
                        name: `${pilot.first_name} ${pilot.last_name}`,
                        rank: pilot.rank,
                        totalHours: pilot.total_hours,
                        firstName: pilot.first_name,
                        lastName: pilot.last_name,
                        hoppieCode: pilot.hoppie_code || '',
                        simMode: pilot.sim_mode || 'fsuipc',
                        simbriefId: pilot.simbrief_id || '',
                        avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ""}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`
                    },
                });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error: any) {
        console.error('ACARS Auth Error:', error);
        return NextResponse.json({ 
            error: 'Authentication failed',
            details: error.message 
        }, { status: 500 });
    }
}

async function handlePosition(params: {
    sessionToken: string;
    pilotId: string;
    callsign: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    groundSpeed: number;
    status: string;
    ias?: number;
    vs?: number;
    phase?: string;
    fuel?: number;
    engines?: number;
    lights?: number;
    pitch?: number;
    bank?: number;
    g_force?: number;
    comfort_score?: number;
}) {
    const { 
        pilotId, callsign, latitude, longitude, altitude, heading, groundSpeed, status,
        ias, vs, phase, fuel, engines, lights, pitch, bank,
        // Accept both snake_case and camelCase from ACARS clients
        g_force, gForce: gForceCamel,
        comfort_score, comfortScore: comfortScoreCamel,
    } = params as any;
    const resolvedGForce = g_force ?? gForceCamel ?? 1.0;
    const resolvedComfort = comfort_score ?? comfortScoreCamel ?? 100;

    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });

        // Blacklist gate: reject data from blacklisted pilots
        if (pilot.status === 'Blacklist') {
            return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
        }

        // Slew/Teleport Detection (Haversine)
        const now = Date.now();
        const lastPos = positionCache.get(pilotId);
        if (lastPos && latitude && longitude) {
            const elapsed = now - lastPos.ts;
            if (elapsed < SLEW_TIME_MS && elapsed > 0) {
                const distNm = haversineNm(lastPos.lat, lastPos.lon, latitude, longitude);
                if (distNm > SLEW_DISTANCE_NM) {
                    const pilotName = `${pilot.first_name} ${pilot.last_name}`;
                    console.warn(`[SLEW] ${pilotId} moved ${distNm.toFixed(1)}nm in ${(elapsed / 1000).toFixed(0)}s`);
                    notifyModeration('slew_detect', pilotName, pilotId,
                        `Moved **${distNm.toFixed(1)} nm** in **${(elapsed / 1000).toFixed(0)}s** (threshold: ${SLEW_DISTANCE_NM}nm / ${SLEW_TIME_MS / 1000}s)`
                    ).catch(() => {});
                }
            }
        }
        positionCache.set(pilotId, { lat: latitude, lon: longitude, ts: now });

        let flight = await ActiveFlight.findOneAndUpdate(
            { pilot_id: pilot._id, callsign },
            {
                latitude,
                longitude,
                altitude,
                heading,
                ground_speed: groundSpeed,
                status,
                ias: ias || 0,
                vertical_speed: vs || 0,
                phase: phase || status,
                fuel: fuel || 0,
                engines: engines || 0,
                lights: lights || 0,
                pitch: pitch || 0,
                bank: bank || 0,
                g_force: resolvedGForce,
                comfort_score: resolvedComfort,
                last_update: new Date()
            },
            { new: true }
        );

        // Fallback: If flight not found (start event missed/server restart), upsert it
        if (!flight) {
            console.log(`ACARS: Flight ${callsign} not found during update. Attempting recovery...`);
            
            // Try to find active bid to get route details (ObjectId + string fallback)
            let activeBid = await Bid.findOne({ 
                pilot_id: pilot._id, 
                status: { $in: ['Active', 'InProgress'] } 
            }).sort({ created_at: -1 });
            if (!activeBid) {
                activeBid = await Bid.findOne({ 
                    pilot_id: pilot._id.toString(), 
                    status: { $in: ['Active', 'InProgress'] } 
                }).sort({ created_at: -1 });
            }

            flight = await ActiveFlight.findOneAndUpdate(
                { callsign },
                {
                    $set: {
                        latitude,
                        longitude,
                        altitude,
                        heading,
                        ground_speed: groundSpeed,
                        status,
                        last_update: new Date(),
                        ias: ias || 0,
                        vertical_speed: vs || 0,
                        phase: phase || status,
                        fuel: fuel || 0,
                        engines: engines || 0,
                        lights: lights || 0,
                        pitch: pitch || 0,
                        bank: bank || 0,
                        g_force: resolvedGForce,
                        comfort_score: resolvedComfort,
                    },
                    $setOnInsert: {
                        pilot_id: pilot._id,
                        pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                        departure_icao: activeBid?.departure_icao || '????',
                        arrival_icao: activeBid?.arrival_icao || '????',
                        aircraft_type: activeBid?.aircraft_type || 'Unknown',
                        started_at: new Date(),
                    },
                },
                { new: true, upsert: true }
            );
            console.log('ACARS: Flight session recovered via upsert.');
        }

        // Check for Takeoff Notification
        // ACARS client sends FlightPhase.ToString() — trigger only on 'Takeoff' phase
        if (flight && !flight.takeoff_notified && (phase === 'Takeoff' || status === 'Takeoff')) {
            flight.takeoff_notified = true;
            await flight.save();

            const pilotName = `${pilot.first_name} ${pilot.last_name}`;

            await notifyTakeoff(
                pilotName,
                pilotId,
                flight.departure_icao,
                flight.arrival_icao,
                flight.aircraft_type,
                callsign
            );
        }
        // Broadcast position update to dashboard clients via Pusher
        await triggerFlightUpdate({
            callsign,
            pilotId,
            latitude,
            longitude,
            altitude,
            heading,
            groundSpeed,
            status,
            ias: ias || 0,
            verticalSpeed: vs || 0,
            phase: phase || status,
            departure: flight?.departure_icao,
            arrival: flight?.arrival_icao,
            equipment: flight?.aircraft_type,
            comfort_score: flight?.comfort_score ?? 100,
            fuel: flight?.fuel || 0,
        });
    } catch (error: any) {
        console.error('ACARS Position Update Error:', error);
        return NextResponse.json({ error: 'Position update failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

async function handleFlightStart(params: {
    sessionToken: string;
    pilotId: string;
    callsign: string;
    departureIcao: string;
    arrivalIcao: string;
    aircraftType: string;
}) {
    const { pilotId, callsign, departureIcao, arrivalIcao, aircraftType } = params;

    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            console.error(`[ACARS FlightStart] Pilot not found: ${pilotId}`);
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }
        
        const pilotName = `${pilot.first_name} ${pilot.last_name}`;
        console.log(`[ACARS FlightStart] Starting flight for ${pilot.pilot_id} (${pilotName}): ${callsign} ${departureIcao}→${arrivalIcao}`);

        // Remove any existing active flight for this pilot to prevent duplicates
        const deletedFlights = await ActiveFlight.deleteMany({ pilot_id: pilot._id });
        if (deletedFlights.deletedCount > 0) {
            console.log(`[ACARS FlightStart] Cleared ${deletedFlights.deletedCount} existing active flight(s)`);
        }

        // Find the active bid - try multiple strategies
        let activeBid = await Bid.findOne({ 
            pilot_id: pilot._id, 
            callsign, 
            status: 'Active' 
        });
        
        // Fallback 1: Try with string pilot_id
        if (!activeBid) {
            activeBid = await Bid.findOne({ 
                pilot_id: pilot._id.toString(), 
                callsign, 
                status: 'Active' 
            });
        }
        
        // Fallback 2: Try any Active bid for this pilot (ignore callsign mismatch)
        if (!activeBid) {
            activeBid = await Bid.findOne({ 
                pilot_id: pilot._id, 
                status: 'Active' 
            }).sort({ created_at: -1 });
            if (activeBid) {
                console.log(`[ACARS FlightStart] Found Active bid with different callsign: ${activeBid.callsign} (requested: ${callsign})`);
            }
        }
        
        // Fallback 3: Try with string pilot_id
        if (!activeBid) {
            activeBid = await Bid.findOne({ 
                pilot_id: pilot._id.toString(), 
                status: 'Active' 
            }).sort({ created_at: -1 });
        }

        if (activeBid) {
            console.log(`[ACARS FlightStart] Found bid ${activeBid._id}, marking as InProgress`);
            activeBid.status = 'InProgress';
            await activeBid.save();

            // Mark the booked aircraft as InFlight to prevent double-booking
            if (activeBid.aircraft_registration) {
                await Fleet.updateOne(
                    { registration: activeBid.aircraft_registration, status: { $ne: 'Grounded' } },
                    { $set: { status: 'InFlight' } }
                );
                console.log(`[ACARS FlightStart] Marked aircraft ${activeBid.aircraft_registration} as InFlight`);
            }
        } else {
            console.warn(`[ACARS FlightStart] No Active bid found for pilot ${pilot.pilot_id} - flight will start without bid`);
        }

        const newFlight = await ActiveFlight.create({
            pilot_id: pilot._id,
            pilot_name: pilotName,
            callsign,
            departure_icao: departureIcao,
            arrival_icao: arrivalIcao,
            aircraft_type: aircraftType,
            latitude: 0,
            longitude: 0,
            status: 'Preflight',
            started_at: new Date(),
            last_update: new Date()
        });
        
        console.log(`[ACARS FlightStart] Created ActiveFlight ${newFlight._id} for ${callsign}`);
    } catch (error: any) {
        console.error('[ACARS FlightStart] Error:', error.message, error.stack);
        return NextResponse.json({ error: 'Failed to start flight', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Flight started' });
}

async function handleFlightEnd(params: { pilotId: string; callsign?: string; status?: string }) {
    const { pilotId, callsign } = params;

    try {
        const pilot = await findPilot(pilotId);
        if (pilot) {
            // 1. Remove ActiveFlight tracking entry
            // If callsign provided, delete exact record; otherwise wipe all active flights for this pilot
            if (callsign) {
                await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
            } else {
                await ActiveFlight.deleteMany({ pilot_id: pilot._id });
            }

            // 2. Find and delete the matching Bid; reset its aircraft to Available
            const bidFilter = callsign
                ? { callsign, status: { $in: ['Active', 'InProgress'] } }
                : { status: { $in: ['Active', 'InProgress'] } };
            let matchingBid = await Bid.findOne({ pilot_id: pilot._id, ...bidFilter });
            if (!matchingBid) {
                matchingBid = await Bid.findOne({ pilot_id: pilot._id.toString(), ...bidFilter });
            }
            if (matchingBid) {
                // Reset the aircraft back to Available (unless grounded)
                if (matchingBid.aircraft_registration) {
                    await Fleet.updateOne(
                        { registration: matchingBid.aircraft_registration, status: 'InFlight' },
                        { $set: { status: 'Available' } }
                    );
                }
                await Bid.deleteOne({ _id: matchingBid._id });
                console.log(`[ACARS] Deleted bid and released aircraft for ${callsign}`);
            }
        }
    } catch (error) {
        console.error('ACARS Flight End Error:', error);
    }

    return NextResponse.json({ success: true, message: 'Flight ended' });
}

async function handlePirep(params: {
    sessionToken: string;
    pilotId: string;
    flightNumber?: string;
    callsign: string;
    departureIcao: string;
    arrivalIcao: string;
    alternateIcao?: string;
    route?: string;
    aircraftType: string;
    aircraftRegistration?: string;
    flightTimeMinutes: number;
    landingRate: number;
    fuelUsed: number;
    distanceNm: number;
    pax?: number;
    cargo?: number;
    score?: number;
    telemetry?: any[];
    comfortScore?: number;
    log?: any;
    airframeDamage?: any;
    comments?: string;
    acars_version?: string;
    acarsVersion?: string;
    timestamp?: number;
    signature?: string;
}) {
    const {
        pilotId,
        flightNumber,
        callsign,
        departureIcao,
        arrivalIcao,
        alternateIcao,
        route,
        aircraftType,
        aircraftRegistration,
        flightTimeMinutes,
        landingRate,
        fuelUsed,
        distanceNm,
        pax,
        cargo,
        score,
        telemetry,
        comfortScore,
        log,
        airframeDamage,
        comments,
        acars_version,
        acarsVersion,
        timestamp,
        signature
    } = params;

    const resolvedAcarsVersion = acarsVersion || acars_version || '1.0.0';

    // --- SECURITY CHECK: HMAC SIGNATURE ---
    const secret = process.env.APP_KEY || "";

    if (secret) {
        // Server has a key configured — enforce signature
        if (timestamp == null || signature == null) {
            console.warn(`Security Violation: Unsigned PIREP attempt by ${pilotId}`);
            return NextResponse.json({ error: 'Security Violation: Unsigned Data' }, { status: 403 });
        }

        // Only verify signature when the client actually sent one (non-empty)
        if (signature !== '') {
            const dataString = `${pilotId}:${landingRate}:${timestamp}`;
            const expectedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
            if (signature !== expectedSignature) {
                console.error(`Security Alert: Signature Mismatch for ${pilotId}. Potential spoofing attempt.`);
                return NextResponse.json({ error: 'Security Violation: Data Integrity Failed' }, { status: 403 });
            }
        } else {
            console.warn(`[PIREP] ${pilotId} submitted without HMAC signature (app_key not set in ACARS config). Allowing with timestamp check only.`);
        }

        // Timestamp check (prevent replay > 5 mins old)
        if (timestamp != null && Date.now() - timestamp > 300000) {
            console.warn(`Security Warning: Stale data from ${pilotId}`);
            return NextResponse.json({ error: 'Data is expired (Replay Protection)' }, { status: 403 });
        }
    }
    // -------------------------------------

    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Blacklist gate
        if (pilot.status === 'Blacklist') {
            return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
        }

        // Hard landing auto-flag: notify staff if < -800 fpm
        if (landingRate < -800) {
            const pilotName = `${pilot.first_name} ${pilot.last_name}`;
            notifyModeration('hard_landing', pilotName, pilotId,
                `Landing rate: **${landingRate} fpm** on ${callsign} (${departureIcao}→${arrivalIcao})`
            ).catch(() => {});
        }

        // Determine approval status
        // Auto-accept all PIREPs where landing rate is above the reject threshold
        const isRejected = landingRate <= parseInt(process.env.AUTO_PIREP_REJECT_LANDING_RATE || "-700");
        
        const status = isRejected ? 2 : 1;

        if (isRejected) {
            // Create rejected flight report
            await Flight.create({
                pilot_id: pilot._id,
                pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                flight_number: flightNumber || 'N/A',
                callsign,
                departure_icao: departureIcao,
                arrival_icao: arrivalIcao,
                alternate_icao: alternateIcao,
                route: route,
                aircraft_type: aircraftType,
                flight_time: flightTimeMinutes,
                landing_rate: landingRate,
                fuel_used: fuelUsed,
                distance: distanceNm,
                pax: pax || 0,
                cargo: cargo || 0,
                score: score || 100,
                deductions: log?.deductions || [],
                log: log,
                approved_status: 2,
                comments: comments,
                acars_version: resolvedAcarsVersion,
                submitted_at: new Date()
            });

            // Remove from active flights + delete bid
            await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
            await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });

            return NextResponse.json({ 
                success: true, 
                message: `PIREP submitted, but REJECTED! Landing rate of ${landingRate} fpm exceeds the safety threshold of ${process.env.AUTO_PIREP_REJECT_LANDING_RATE || '-700'} fpm.`
            });
        }

        // --- ECONOMY & EXPENSES (GlobalConfig-driven) ---
        const config = await getConfig();

        const TICKET_PRICE_PER_NM = config.ticket_price_per_nm;
        const CARGO_PRICE_PER_LB_NM = config.cargo_price_per_lb_nm;
        const FUEL_PRICE_PER_LB = config.fuel_price_per_lb;
        const BASE_LANDING_FEE = config.base_landing_fee;
        const PILOT_PAY_RATE = config.pilot_pay_rate;
        const FUEL_TAX_PERCENT = config.fuel_tax_percent;
        const PENALTY_MULTIPLIER = config.penalty_multiplier;

        // 1. Calculate Revenue
        const simPax = pax || Math.floor(Math.random() * (150 - 50 + 1) + 50); 
        const simCargo = cargo || Math.floor(Math.random() * (5000 - 500 + 1) + 500);

        const revenuePax = Math.round(simPax * distanceNm * TICKET_PRICE_PER_NM);
        const revenueCargo = Math.round(simCargo * distanceNm * CARGO_PRICE_PER_LB_NM);
        const totalRevenue = revenuePax + revenueCargo;

        // 2. Calculate Expenses
        const costFuel = Math.round(fuelUsed * FUEL_PRICE_PER_LB);
        const costLanding = BASE_LANDING_FEE + Math.round(distanceNm * 0.1);
        const costPilot = Math.round((flightTimeMinutes / 60) * PILOT_PAY_RATE);
        const costMaintenance = Math.round(distanceNm * 0.5);

        const totalExpenses = costFuel + costLanding + costPilot + costMaintenance;

        // 3. Revenue Distribution: Fuel Tax + Scoring Penalties → Airline Vault (Cr)
        // Formula: fuelTaxAmount = grossIncome * (fuelTaxPct / 100)
        const flightPoints = score || 100;
        const fuelTaxAmount = Math.round(totalRevenue * (FUEL_TAX_PERCENT / 100));
        // Formula: penaltyAmount = (100 - flightPoints) * penaltyMultiplier
        const penaltyAmount = Math.round((100 - flightPoints) * PENALTY_MULTIPLIER);
        const totalDeductions = fuelTaxAmount + penaltyAmount;

        // netPilotPay = Math.max(0, grossIncome - totalDeductions)
        let netPilotPay = Math.max(0, totalRevenue - totalDeductions);

        // Net profit for airline = revenue - expenses (airline keeps fuelTax + fines as extra)
        let netProfit = totalRevenue - totalExpenses;

        // DOTM Bonus Check — only award if flight is within the DOTM's active month
        const activeDotm = await DestinationOfTheMonth.findOne({ is_active: true });
        let dotmBonus = 0;
        if (activeDotm) {
            const now = new Date();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonth = monthNames[now.getMonth()];
            const currentYear = now.getFullYear();

            // Only award bonus if we're still within the DOTM's month/year
            const isWithinDotmPeriod = activeDotm.month === currentMonth && activeDotm.year === currentYear;

            if (isWithinDotmPeriod && (departureIcao === activeDotm.airport_icao || arrivalIcao === activeDotm.airport_icao)) {
                dotmBonus = activeDotm.bonus_points;
            }

            // Auto-deactivate if the month has passed
            if (!isWithinDotmPeriod) {
                await DestinationOfTheMonth.updateOne({ _id: activeDotm._id }, { is_active: false });
            }
        }

        // --- BUTTER BONUS (Pilot Points) ---
        let butterBonus = 0;
        const landingAnalysis = log?.landingAnalysis;
        if (landingAnalysis && landingAnalysis.butterScore >= 8.0) {
             butterBonus = Math.round(landingAnalysis.butterScore * 50);

             // --- Social Feed Posting Removed ---
             // Auto-posting logic has been deprecated per user request.
        }

        // --- CHECKRIDE LOGIC ---
        let checkrideStatus = 'N/A';
        if (flightNumber && (flightNumber.startsWith('CHK') || flightNumber.startsWith('EXAM'))) {
            checkrideStatus = 'Passed';
            if (landingRate < -400) checkrideStatus = 'Failed (Hard Landing)';
            if (landingAnalysis?.gForceTouchdown && Math.abs(landingAnalysis.gForceTouchdown) > 1.6) checkrideStatus = 'Failed (High G-Force)';
            
            if (checkrideStatus.startsWith('Failed')) {
                 await Flight.create({
                    pilot_id: pilot._id,
                    pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                    flight_number: flightNumber || 'N/A',
                    callsign,
                    departure_icao: departureIcao,
                    arrival_icao: arrivalIcao,
                    aircraft_type: aircraftType,
                    flight_time: flightTimeMinutes,
                    landing_rate: landingRate,
                    fuel_used: fuelUsed,
                    distance: distanceNm,
                    approved_status: 2, // Rejected
                    comments: `CHECKRIDE FAILED: ${checkrideStatus}`,
                    acars_version: resolvedAcarsVersion,
                    submitted_at: new Date()
                });
                await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
                await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
                return NextResponse.json({ success: true, message: `Checkride FAILED: ${checkrideStatus}. Please try again.` });
            }
        }

        // --- UPDATE FLIGHT RECORD WITH FINANCIALS ---
        const newFlight = await Flight.create({
            pilot_id: pilot._id,
            pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            flight_number: flightNumber || 'N/A',
            callsign,
            departure_icao: departureIcao,
            arrival_icao: arrivalIcao,
            alternate_icao: alternateIcao,
            route: route,
            aircraft_type: aircraftType,
            flight_time: flightTimeMinutes,
            landing_rate: landingRate,
            landing_grade: (() => {
                const abs = Math.abs(landingRate);
                if (abs <= 60) return 'Butter';
                if (abs <= 150) return 'Smooth';
                if (abs <= 300) return 'Acceptable';
                if (abs <= 500) return 'Firm';
                return 'Hard';
            })(),
            max_g_force: landingAnalysis?.gForceTouchdown || log?.maxGForce || 1.0,
            fuel_used: fuelUsed,
            distance: distanceNm,
            pax: simPax,
            cargo: simCargo,
            score: score || 100,
            deductions: log?.deductions || [],
            telemetry: telemetry || [],
            comfort_score: comfortScore || 100,
            log: log,
            approved_status: status,
            comments: comments,
            acars_version: resolvedAcarsVersion,
            submitted_at: new Date(),
            // Financials
            revenue_passenger: revenuePax,
            revenue_cargo: revenueCargo,
            expense_fuel: costFuel,
            expense_airport: costLanding,
            expense_pilot: costPilot,
            expense_maintenance: costMaintenance,
            real_profit: netProfit,
            // Passenger Feedback
            passenger_rating: Math.max(1, Math.min(5, Math.ceil((score || 100) / 20))),
            passenger_review: generatePassengerReview(landingRate, score || 100)
        });

        // --- EVENT BOOKING AUTO-MATCH ---
        // If the pilot booked an event, and this PIREP is filed within the event time window,
        // mark the booking as attended and link the flight to the event.
        try {
            const booking = await EventBooking.findOne({
                pilot_id: pilot._id,
                status: 'booked',
            }).sort({ booked_at: -1 });

            if (booking) {
                const event = await Event.findById(booking.event_id);
                if (event?.is_active) {
                    const start = (event.start_time || event.start_datetime) ? new Date(event.start_time || event.start_datetime) : null;
                    const end = (event.end_time || event.end_datetime) ? new Date(event.end_time || event.end_datetime) : null;
                    const t = new Date(newFlight.submitted_at);

                    // If no end is configured, allow a generous window of 12h from start.
                    const effectiveEnd = end || (start ? new Date(start.getTime() + 12 * 60 * 60 * 1000) : null);

                    const inWindow = !!(start && effectiveEnd && t >= start && t <= effectiveEnd);

                    // Optional: match airports if event has airports configured.
                    const evAirports = (event.airports || []).map((a: string) => a.toUpperCase());
                    const flightDep = (departureIcao || '').toUpperCase();
                    const flightArr = (arrivalIcao || '').toUpperCase();
                    const airportsMatch = evAirports.length === 0
                        ? true
                        : (evAirports.includes(flightDep) || evAirports.includes(flightArr));

                    if (inWindow && airportsMatch) {
                        await EventBooking.updateOne(
                            { _id: booking._id },
                            {
                                $set: {
                                    status: 'attended',
                                    flight_id: newFlight._id,
                                    attended_at: new Date(),
                                }
                            }
                        );

                        await Flight.updateOne(
                            { _id: newFlight._id },
                            { $set: { event_id: event._id } }
                        );
                    }
                }
            }
        } catch (e) {
            // Do not fail PIREP submission on event match issues
            console.error('[ACARS] Event booking match failed:', e);
        }

        // Helper to generate dynamic reviews
        function generatePassengerReview(rate: number, score: number) {
            const reviews = {
                excellent: [
                    "Best flight of my life! The landing was like a kiss.",
                    "Smooth operator! Didn't even feel the touchdown.",
                    "Professional service and a perfect landing. A+",
                    "Luxury in the air. 5 stars all the way."
                ],
                good: [
                    "A solid flight, fairly smooth arrival.",
                    "Everything went well. The crew was very polite.",
                    "On time and safe. Average landing.",
                    "Good value for money. Would fly Levant again."
                ],
                firm: [
                    "A bit of a bump on landing, but we got there safe.",
                    "Decent flight, but the touchdown was a little firm.",
                    "Average experience. Nothing special.",
                    "Work on those landings! Otherwise a good flight."
                ],
                bad: [
                    "I think I need to see a chiropractor! Hard landing.",
                    "Terrifying landing. Why was it so hard?",
                    "Not a great experience. Very rough arrival.",
                    "Please retrain the pilot. That was not smooth at all."
                ]
            };

            if (rate > -150 && score >= 90) return reviews.excellent[Math.floor(Math.random() * reviews.excellent.length)];
            if (rate > -300 && score >= 75) return reviews.good[Math.floor(Math.random() * reviews.good.length)];
            if (rate > -500) return reviews.firm[Math.floor(Math.random() * reviews.firm.length)];
            return reviews.bad[Math.floor(Math.random() * reviews.bad.length)];
        }

        // --- UPDATE AIRLINE FINANCES ---
        // 1. Get or Create Finance Record
        let airlineFinance = await AirlineFinance.findOne();
        if (!airlineFinance) {
            airlineFinance = await AirlineFinance.create({ balance: 1000000 });
        }

        // 2. Log Transactions (Standard Expense Logs)
        await FinanceLog.insertMany([
            { amount: totalRevenue, type: 'Flight Revenue', description: `Revenue Flight ${callsign} (${departureIcao}-${arrivalIcao})`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costFuel, type: 'Fuel Cost', description: `Fuel for ${callsign}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costLanding, type: 'Landing Fee', description: `Landing Fees at ${arrivalIcao}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costPilot, type: 'Pilot Pay', description: `Pilot Salary for ${pilot.first_name} ${pilot.last_name}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costMaintenance, type: 'Maintenance', description: `Wear & Tear for ${aircraftType}`, reference_id: newFlight._id, pilot_id: pilot._id },
            // AUDIT: Revenue Split Transaction — Fuel Tax + Penalties → Vault
            { amount: totalDeductions, type: 'FLIGHT_REVENUE_SPLIT', description: `Vault deposit: FuelTax ${fuelTaxAmount} Cr (${FUEL_TAX_PERCENT}%) + Penalties ${penaltyAmount} Cr (Score: ${flightPoints}/100) from ${callsign}`, reference_id: newFlight._id, pilot_id: pilot._id },
        ]);

        // 3. Update Airline Finance Balance
        // Airline gets: netProfit + fuelTax + penalties (deductions flow to Vault)
        airlineFinance.balance += netProfit + totalDeductions;
        airlineFinance.total_revenue += totalRevenue;
        airlineFinance.total_expenses += totalExpenses;
        airlineFinance.last_updated = new Date();
        await airlineFinance.save();

        // 4. Update Pilot Stats (Net Pay after fuel tax + fines)
        const flightCredits = netPilotPay + dotmBonus + butterBonus;

        await Pilot.findByIdAndUpdate(pilot.id, {
            $inc: {
                total_flights: 1,
                total_hours: flightTimeMinutes / 60,
                total_credits: totalRevenue, // Lifetime XP (gross)
                balance: flightCredits // Net cash after deductions
            },
            current_location: arrivalIcao,
            last_activity: new Date(),
            status: 'Active'
        });

        // 5. Fleet Tracking & Airframe Damage
        let closedBid = await Bid.findOne({ 
            pilot_id: pilot._id, 
            callsign: callsign,
            status: { $in: ['Active', 'InProgress'] }
        });
        if (!closedBid) {
            closedBid = await Bid.findOne({ 
                pilot_id: pilot._id.toString(), 
                callsign: callsign,
                status: { $in: ['Active', 'InProgress'] }
            });
        }

        let specificAircraft = null;
        // Priority: ACARS-sent registration > Bid registration > Type+Location fallback
        if (aircraftRegistration) {
            specificAircraft = await Fleet.findOne({ registration: aircraftRegistration });
        }
        if (!specificAircraft && closedBid?.aircraft_registration) {
             specificAircraft = await Fleet.findOne({ registration: closedBid.aircraft_registration });
        }
        if (!specificAircraft && aircraftType) {
            specificAircraft = await Fleet.findOne({ 
                aircraft_type: aircraftType, 
                current_location: departureIcao 
            });
        }

        // Delete bid from DB after flight submission (clean up)
        if (closedBid) {
            await Bid.deleteOne({ _id: closedBid._id });
        }

        let aircraftHealthAfter = 100;
        if (specificAircraft) {
            const healthBefore = specificAircraft.condition;

            // Use ACARS-reported damage if available, otherwise fallback to server-side calculation
            let damage = 0.5; // Base wear & tear
            if (airframeDamage && airframeDamage.totalDamage > 0) {
                damage = airframeDamage.totalDamage;
            } else {
                // Fallback: server-side damage calculation
                if (landingRate < -400) damage += (Math.abs(landingRate) - 400) * 0.1;
                if (landingAnalysis?.gForceTouchdown) {
                    const g = Math.abs(landingAnalysis.gForceTouchdown);
                    if (g > 1.8) damage += (g - 1.8) * 10;
                }
            }

            specificAircraft.current_location = arrivalIcao;
            specificAircraft.condition = Math.max(0, Math.round((specificAircraft.condition - damage) * 100) / 100);
            specificAircraft.total_hours += (flightTimeMinutes / 60);
            specificAircraft.flight_count += 1;
            
            // Push damage event to aircraft damage_log
            if (damage > 0.5) {
                specificAircraft.damage_log = specificAircraft.damage_log || [];
                specificAircraft.damage_log.push({
                    type: damage >= 50 ? 'SEVERE' : damage >= 5 ? 'HARD_LANDING' : 'WEAR',
                    amount: parseFloat(damage.toFixed(2)),
                    timestamp: new Date(),
                    flight_id: newFlight._id?.toString()
                });
                // Keep only last 50 damage events
                if (specificAircraft.damage_log.length > 50) {
                    specificAircraft.damage_log = specificAircraft.damage_log.slice(-50);
                }
            }

            // Auto-status based on condition
            const groundedThreshold = config.grounded_health_threshold;
            if (specificAircraft.condition < groundedThreshold) {
                specificAircraft.status = 'Grounded';
                specificAircraft.grounded_reason = `Health dropped to ${specificAircraft.condition.toFixed(1)}% after flight ${callsign}`;
            } else if (specificAircraft.condition < 40) {
                specificAircraft.status = 'Maintenance';
            } else {
                specificAircraft.status = 'Available';
            }

            await specificAircraft.save();
            aircraftHealthAfter = specificAircraft.condition;

            // Log maintenance event
            if (damage > 0.5) {
                await MaintenanceLog.create({
                    aircraft_registration: specificAircraft.registration,
                    type: damage >= 50 ? 'DAMAGE_HARD_LANDING' : 'DAMAGE_FLIGHT',
                    health_before: healthBefore,
                    health_after: specificAircraft.condition,
                    cost_cr: 0,
                    description: `Flight ${callsign}: ${damage.toFixed(1)}% damage (LR: ${landingRate} fpm)`,
                    flight_id: newFlight._id,
                    pilot_id: pilot._id,
                });
            }
        }

        let tourMessage = '';

        // --- ACTIVITY PROGRESSION LOGIC (v3.25.0) ---
        if (closedBid && closedBid.activity_id) {
            try {
                const activityId = closedBid.activity_id;
                const activity = await Activity.findById(activityId);
                
                if (activity && activity.active) {
                    // 1. Get or Create Progress
                    let progress = await ActivityProgress.findOne({ 
                        pilot_id: pilot._id, 
                        activity_id: activityId 
                    });
                    
                    if (!progress) {
                        progress = await ActivityProgress.create({
                            pilot_id: pilot._id,
                            activity_id: activityId,
                            legsComplete: 0,
                            percentComplete: 0,
                            completedLegIds: []
                        });
                    }

                    // 2. Find which leg was flown
                    const legs = activity.activityLegs || [];
                    const matches = legs.filter((leg: any) => {
                        const routeMatch = (!leg.departure_icao || leg.departure_icao === departureIcao) && 
                                         (!leg.arrival_icao || leg.arrival_icao === arrivalIcao);
                        const aircraftMatch = !leg.aircraft_types || leg.aircraft_types.length === 0 || 
                                           leg.aircraft_types.includes(aircraftType);
                        return routeMatch && aircraftMatch;
                    });

                    // If multiple matches, we might need more logic, but for now take the first uncompleted one
                    const legToMark = matches.find((leg: any) => !progress?.completedLegIds.includes(leg.id));

                    if (legToMark && legToMark.id) {
                        progress.completedLegIds.push(legToMark.id);
                        progress.legsComplete = progress.completedLegIds.length;
                        progress.percentComplete = Math.round((progress.legsComplete / legs.length) * 100);
                        progress.lastLegFlownDate = new Date();

                        if (progress.legsComplete >= legs.length) {
                            progress.dateComplete = new Date();
                            const startTime = progress.startDate.getTime();
                            const endTime = progress.dateComplete.getTime();
                            progress.daysToComplete = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
                            
                            // Award points
                            const rewardPoints = activity.reward_points || 0;
                            if (rewardPoints > 0) {
                                await Pilot.findByIdAndUpdate(pilot.id, { 
                                    $inc: { 
                                        balance: rewardPoints, 
                                        total_credits: rewardPoints 
                                    } 
                                });
                                tourMessage += ` ACTIVITY COMPLETED: ${activity.title}! Bonus ${rewardPoints} credits!`;
                            } else {
                                tourMessage += ` ACTIVITY COMPLETED: ${activity.title}!`;
                            }
                        } else {
                            tourMessage += ` Activity Leg ${progress.legsComplete} of ${legs.length} Completed! (${activity.title})`;
                        }
                        
                        await progress.save();
                    }
                }
            } catch (actErr) {
                console.error('Error updating activity progress:', actErr);
            }
        }

        // --- TOUR PROGRESSION LOGIC (Legacy) ---
        const activeTours = await TourProgress.find({ pilot_id: pilot._id, status: 'In Progress' });

        for (const progress of activeTours) {
            const tour = await Tour.findById(progress.tour_id);
            if (tour && tour.is_active) {
                const legs = tour.legs;
                const nextLegIndex = progress.current_leg_index;
                
                if (nextLegIndex < legs.length) {
                    const nextLeg = legs[nextLegIndex];
                    const routeMatch = (nextLeg.departure_icao === departureIcao && nextLeg.arrival_icao === arrivalIcao);
                    const aircraftMatch = (!nextLeg.aircraft_type || nextLeg.aircraft_type.length === 0 || nextLeg.aircraft_type.includes(aircraftType));

                    if (routeMatch && aircraftMatch) {
                        progress.completed_legs.push(new Date());
                        progress.current_leg_index += 1;
                        
                        if (progress.current_leg_index >= legs.length) {
                            progress.status = 'Completed';
                            progress.completed_at = new Date();
                            if (tour.reward_credits > 0) {
                                await Pilot.findByIdAndUpdate(pilot.id, { $inc: { balance: tour.reward_credits, total_credits: tour.reward_credits } });
                                tourMessage += ` TOUR COMPLETED: ${tour.name}! Bonus ${tour.reward_credits} credits!`;
                            } else {
                                tourMessage += ` TOUR COMPLETED: ${tour.name}!`;
                            }

                            // --- AUTO-GRANT AWARD ON TOUR COMPLETION ---
                            try {
                                const { default: Award } = await import('@/models/Award');
                                const tourAward = await Award.findOne({ linkedTourId: tour._id, active: true });
                                if (tourAward) {
                                    const normalized = (aircraftType || '').replace(/[\s\-_]/g, '').toUpperCase();
                                    const isA380 = normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380');
                                    if (isA380) {
                                        tourMessage += ` Fleet violation (A380) — award not granted.`;
                                    } else {
                                        const existing = await PilotAward.findOne({ pilot_id: pilot._id, award_id: tourAward._id });
                                        if (!existing) {
                                            await PilotAward.create({ pilot_id: pilot._id, award_id: tourAward._id, earned_at: new Date() });
                                            tourMessage += ` AWARD UNLOCKED: ${tourAward.name}!`;
                                        }
                                    }
                                }
                            } catch (awardErr) {
                                console.error('Error auto-granting tour award:', awardErr);
                            }
                        } else {
                            tourMessage += ` Tour Leg ${nextLegIndex + 1} Completed! (${tour.name})`;
                        }
                        
                        await progress.save();
                    }
                }
            }
        }

        // 4. Remove from active flights
        await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
        
        // --- EVENT BOOKING LOGIC ---
        const eventBooking = await EventBooking.findOne({ 
            pilot_id: pilot._id, 
            status: 'booked'
        }).populate('event_id');

        let eventMessage = '';
        if (eventBooking && eventBooking.event_id) {
            const event = eventBooking.event_id as any;
            
            const deptMatch = event.airports.includes(departureIcao);
            const arrMatch = event.airports.includes(arrivalIcao);

            if (deptMatch && arrMatch) {
                eventBooking.status = 'completed';
                await eventBooking.save();

                const eventBonus = 500;
                await Pilot.findByIdAndUpdate(pilot.id, { $inc: { total_credits: eventBonus, balance: eventBonus } });
                eventMessage = ` EVENT FLIGHT COMPLETED: ${event.title}! Bonus ${eventBonus} credits!`;
            }
        }

        // 5. Discord Notification (Landing)
        await notifyLanding(
            `${pilot.first_name} ${pilot.last_name}`,
            pilot.pilot_id,
            arrivalIcao,
            landingRate,
            score || 100,
            callsign
        );

        // 6. Check for Rank Upgrade & Awards
        const newRank = await checkAndUpgradeRank(pilot.id.toString());
        const newlyGrantedAwards = await checkAndGrantAwards(pilot.id.toString());

        // 7. Flight Credits — calculate and award bonus CR
        let creditBreakdown = null;
        try {
            const isEventFlight = !!(eventBooking && eventBooking.event_id);
            creditBreakdown = await calculateFlightCredits({
                pilotId: pilot.pilot_id,
                departureIcao,
                arrivalIcao,
                landingRate,
                flightTimeMinutes,
                fuelUsed,
                plannedFuel: closedBid?.planned_fuel,
                log,
                isEventFlight,
            });
            if (creditBreakdown.total > 0) {
                await awardFlightCredits(pilot.pilot_id, creditBreakdown.total, departureIcao, arrivalIcao);
            }
            // Persist credits on the flight record
            await Flight.findByIdAndUpdate(newFlight._id, {
                credits_earned: creditBreakdown.total,
                credits_breakdown: creditBreakdown.details,
            });
        } catch (crErr) {
            console.error('Credit calculation error (non-fatal):', crErr);
        }

        // 8. Persistent Airframe Repair Timer — hard landings put aircraft under repair
        if (specificAircraft && landingRate < -600) {
            try {
                const damagePercent = Math.abs(landingRate + 400) * 0.05;
                const repairHoursPerPercent = config.repair_hours_per_percent || 2;
                const repairHours = Math.ceil(damagePercent * repairHoursPerPercent);
                const repairUntil = new Date(Date.now() + repairHours * 60 * 60 * 1000);

                specificAircraft.status = 'Maintenance';
                specificAircraft.repair_until = repairUntil;
                specificAircraft.damaged_at = new Date();
                specificAircraft.damaged_by_pilot = pilot.pilot_id;
                specificAircraft.damaged_by_flight = newFlight._id?.toString();
                specificAircraft.grounded_reason = `Hard landing ${landingRate} fpm — Under repair until ${repairUntil.toISOString().slice(0, 16)}Z`;
                await specificAircraft.save();
            } catch (repairErr) {
                console.error('Repair timer error (non-fatal):', repairErr);
            }
        }
        
        let message = `PIREP accepted. Airline Profit: ${netProfit > 0 ? '+' : ''}${netProfit}cr. You earned: ${flightCredits}cr.`;
        
        if (creditBreakdown) message += ` +${creditBreakdown.total} bonus CR`;
        if (checkrideStatus === 'Passed') message += ` CHECKRIDE PASSED!`;
        if (dotmBonus > 0) message += ` (Includes ${dotmBonus} DOTM Bonus!)`;
        if (butterBonus > 0) message += ` (Includes ${butterBonus} Butter Bonus!)`;
        if (tourMessage) message += tourMessage;
        if (eventMessage) message += eventMessage;
        if (newRank) message += ` PROMOTION: ${newRank}!`;

        return NextResponse.json({ 
            success: true, 
            message,
            creditsEarned: flightCredits,
            bonusCredits: creditBreakdown?.total || 0,
            creditsBreakdown: creditBreakdown?.details || [],
            newRank,
            newlyGrantedAwards,
            // Revenue breakdown for UI
            revenueBreakdown: {
                grossRevenue: totalRevenue,
                fuelTax: fuelTaxAmount,
                penaltyFines: penaltyAmount,
                totalDeductions: totalDeductions,
                netPilotPay,
                dotmBonus,
                butterBonus,
                totalEarned: flightCredits,
            },
            // Aircraft health for UI
            aircraftHealth: aircraftHealthAfter,
        });

    } catch (error) {
        console.error('ACARS PIREP Error:', error);
        return NextResponse.json({ error: 'Failed to submit PIREP' }, { status: 500 });
    }
}

async function handleBookFlight(params: any) {
    const { 
        pilotId, 
        callsign, 
        departure_icao, 
        arrival_icao, 
        aircraft_type, 
        aircraft_registration,
        route,
        estimated_flight_time,
        pax,
        cargo,
        simbrief_ofp_id,
        activity_id
    } = params;

    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // 1. Check if pilot already has an active bid
        let existingBid = await Bid.findOne({ 
            pilot_id: pilot._id, 
            status: 'Active' 
        });
        if (!existingBid) {
            existingBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: 'Active' });
        }

        if (existingBid) {
            // Auto-cancel previous bid? Or error? 
            // For ACARS, let's auto-cancel to make it smooth
            existingBid.status = 'Cancelled';
            await existingBid.save();
        }

        // 2. Location-based fleet & repair timer enforcement
        if (aircraft_registration) {
            const aircraft = await Fleet.findOne({ registration: aircraft_registration });
            if (aircraft) {
                // Check repair timer — auto-clear if expired
                if (aircraft.repair_until && new Date(aircraft.repair_until) > new Date()) {
                    const remaining = Math.ceil((new Date(aircraft.repair_until).getTime() - Date.now()) / (1000 * 60 * 60));
                    return NextResponse.json({ 
                        error: `Aircraft ${aircraft_registration} is under repair. Available in ~${remaining}h.` 
                    }, { status: 400 });
                }
                if (aircraft.repair_until && new Date(aircraft.repair_until) <= new Date()) {
                    aircraft.status = 'Available';
                    aircraft.repair_until = undefined;
                    aircraft.grounded_reason = undefined;
                    await aircraft.save();
                }

                // Check if grounded/maintenance
                if (aircraft.status === 'Grounded') {
                    return NextResponse.json({ 
                        error: `Aircraft ${aircraft_registration} is grounded: ${aircraft.grounded_reason || 'maintenance required'}` 
                    }, { status: 400 });
                }

                // Location-based fleet check
                const config = await getConfig();
                if (config.location_based_fleet && aircraft.current_location !== departure_icao.toUpperCase()) {
                    return NextResponse.json({ 
                        error: `Aircraft ${aircraft_registration} is currently at ${aircraft.current_location}, not ${departure_icao.toUpperCase()}. You must fly it from its current location.` 
                    }, { status: 400 });
                }
            }
        }

        // 3. Create Bid
        const newBid = await Bid.create({
            pilot_id: pilot._id,
            pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            callsign,
            departure_icao: departure_icao.toUpperCase(),
            arrival_icao: arrival_icao.toUpperCase(),
            aircraft_type,
            aircraft_registration,
            route,
            estimated_flight_time,
            pax,
            cargo,
            simbrief_ofp_id,
            activity_id,
            status: 'Active'
        });

        return NextResponse.json({ success: true, bid: newBid });

    } catch (error: any) {
        console.error('ACARS Booking error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// --- Helper: Get or Create GlobalConfig ---
async function getConfig() {
    let config = await GlobalConfig.findOne({ key: 'LVT_MAIN' });
    if (!config) {
        config = await GlobalConfig.create({ key: 'LVT_MAIN' });
    }
    return config;
}

// --- Aircraft Health Check (Pre-flight) ---
async function handleAircraftHealth(params: { registration: string }) {
    const { registration } = params;
    if (!registration) {
        return NextResponse.json({ health: 100, status: 'Available', grounded: false });
    }

    try {
        const aircraft = await Fleet.findOne({ registration });
        if (!aircraft) {
            return NextResponse.json({ health: 100, status: 'Available', grounded: false });
        }

        const config = await getConfig();
        const airlineFinance = await AirlineFinance.findOne();
        const groundedThreshold = config.grounded_health_threshold;
        const isGrounded = aircraft.condition < groundedThreshold;
        const repairNeeded = 100 - aircraft.condition;
        const estimatedRepairCost = Math.round(repairNeeded * config.repair_rate_per_percent);

        // Auto-update status if grounded
        if (isGrounded && aircraft.status !== 'Grounded' && aircraft.status !== 'Maintenance') {
            aircraft.status = 'Grounded';
            aircraft.grounded_reason = `Health below ${groundedThreshold}%: requires maintenance`;
            await aircraft.save();
        }

        return NextResponse.json({
            health: aircraft.condition,
            status: aircraft.status,
            grounded: isGrounded,
            groundedReason: isGrounded ? (aircraft.grounded_reason || `Aircraft health ${aircraft.condition}% is below ${groundedThreshold}% threshold`) : null,
            estimatedRepairCost,
            repairRatePerPercent: config.repair_rate_per_percent,
            airlineFunds: airlineFinance?.balance ?? 0,
            totalHours: aircraft.total_hours,
            flightCount: aircraft.flight_count,
            lastService: aircraft.last_service,
        });
    } catch (error: any) {
        console.error('Aircraft Health Check Error:', error);
        return NextResponse.json({ health: 100, status: 'Available', grounded: false });
    }
}

// --- Live Traffic: return all active flights ---
async function handleTraffic() {
    try {
        const flights = await ActiveFlight.find({
            last_update: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // active in last 10 min
        }).select('-__v -takeoff_notified -engines -lights -pitch -bank').lean();

        const traffic = flights.map((f: any) => ({
            callsign: f.callsign,
            pilotName: f.pilot_name,
            departureIcao: f.departure_icao || '',
            arrivalIcao: f.arrival_icao || '',
            aircraftType: f.aircraft_type || '',
            latitude: f.latitude,
            longitude: f.longitude,
            altitude: f.altitude,
            heading: f.heading,
            groundSpeed: f.ground_speed,
            ias: f.ias,
            verticalSpeed: f.vertical_speed,
            phase: f.phase,
            fuel: f.fuel,
            gForce: f.g_force,
            comfortScore: f.comfort_score,
            startedAt: f.started_at,
            lastUpdate: f.last_update,
        }));

        return NextResponse.json({ success: true, count: traffic.length, traffic });
    } catch (error: any) {
        console.error('ACARS Traffic Error:', error);
        return NextResponse.json({ error: 'Failed to fetch traffic' }, { status: 500 });
    }
}

// --- Pilot Stats: return pilot profile + recent flights ---
async function handlePilotStats(pilotId: string) {
    if (!pilotId) {
        return NextResponse.json({ error: 'pilotId required' }, { status: 400 });
    }

    try {
        const pilot = await findPilot(pilotId);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        const recentFlights = await Flight.find({ pilot_id: pilot._id })
            .sort({ submitted_at: -1 })
            .limit(10)
            .select('flight_number callsign departure_icao arrival_icao aircraft_type flight_time landing_rate landing_grade score distance submitted_at approved_status')
            .lean();

        const totalFlights = await Flight.countDocuments({ pilot_id: pilot._id, approved_status: { $ne: 2 } });

        // Active bid (ObjectId + string fallback)
        let activeBid = await Bid.findOne({ pilot_id: pilot._id, status: 'Active' }).sort({ created_at: -1 }).lean();
        if (!activeBid) {
            activeBid = await Bid.findOne({ pilot_id: pilot._id.toString(), status: 'Active' }).sort({ created_at: -1 }).lean();
        }

        return NextResponse.json({
            success: true,
            pilot: {
                pilotId: pilot.pilot_id,
                name: `${pilot.first_name} ${pilot.last_name}`,
                rank: pilot.rank,
                totalHours: pilot.total_hours,
                xp: pilot.xp || 0,
                totalFlights,
                avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'dh6ytzk50'}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`,
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
                callsign: activeBid.callsign,
                departureIcao: activeBid.departure_icao,
                arrivalIcao: activeBid.arrival_icao,
                aircraftType: activeBid.aircraft_type,
                route: activeBid.route,
            } : null,
        });
    } catch (error: any) {
        console.error('ACARS Pilot Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch pilot stats' }, { status: 500 });
    }
}
