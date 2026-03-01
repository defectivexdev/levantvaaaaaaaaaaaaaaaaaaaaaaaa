import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import Flight from '@/models/Flight';
import ActiveFlight from '@/models/ActiveFlight';
import { corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET — status page (browser) or traffic/pilot-stats queries (ACARS client)
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'traffic') {
            const { POST: trafficHandler } = await import('@/app/api/acars/traffic/route');
            return trafficHandler(request);
        }

        if (action === 'pilot-stats') {
            const { GET: statsHandler } = await import('@/app/api/acars/pilot-stats/route');
            return statsHandler(request);
        }

        // Status page
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
    <div class="logo">&#9992;</div>
    <div>
      <div class="title">Levant VA &mdash; ACARS API</div>
      <div class="subtitle">Aircraft Communications &amp; Reporting System &nbsp;&middot;&nbsp; v1.3.0</div>
    </div>
    <div style="margin-left:auto"><span class="badge">ONLINE</span></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-value">${activeFlights}</div><div class="stat-label">Active Flights</div></div>
    <div class="stat"><div class="stat-value">${totalPilots}</div><div class="stat-label">Registered Pilots</div></div>
    <div class="stat"><div class="stat-value">${totalFlights}</div><div class="stat-label">Total PIREPs</div></div>
  </div>
  <div class="section">
    <div class="section-header">POST Endpoints &nbsp;&middot;&nbsp; /api/acars/[action]</div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/auth</div><div class="ep-desc">Authenticate pilot and get session token</div><div class="ep-params">{ pilotId, password }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/bid</div><div class="ep-desc">Fetch active bid, book, or cancel flight plan</div><div class="ep-params">{ pilotId } &nbsp;|&nbsp; { action: "book", ... } &nbsp;|&nbsp; { action: "cancel-bid", pilotId }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/start</div><div class="ep-desc">Notify flight departure and create tracking record</div><div class="ep-params">{ pilotId, callsign, departureIcao, arrivalIcao, aircraftType }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/position</div><div class="ep-desc">Send live position update (every ~5s)</div><div class="ep-params">{ pilotId, callsign, latitude, longitude, altitude, heading, groundSpeed, status, phase }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/pirep</div><div class="ep-desc">Submit completed flight report</div><div class="ep-params">{ pilotId, callsign, departureIcao, arrivalIcao, flightTimeMinutes, landingRate, fuelUsed, distanceNm, score, timestamp, signature }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/end</div><div class="ep-desc">Notify flight ended or cancelled</div><div class="ep-params">{ pilotId, callsign }</div></div></div>
    <div class="endpoint"><span class="method post">POST</span><div><div class="ep-path">/api/acars/aircraft-health</div><div class="ep-desc">Pre-flight aircraft health check</div><div class="ep-params">{ registration }</div></div></div>
  </div>
  <div class="section">
    <div class="section-header">GET Endpoints</div>
    <div class="endpoint"><span class="method get">GET</span><div><div class="ep-path">/api/acars?action=traffic</div><div class="ep-desc">All active flights for live map</div></div></div>
    <div class="endpoint"><span class="method get">GET</span><div><div class="ep-path">/api/acars?action=pilot-stats&amp;pilotId=LVT001</div><div class="ep-desc">Pilot statistics and recent flights</div></div></div>
    <div class="endpoint"><span class="method get">GET</span><div><div class="ep-path">/api/acars/ping</div><div class="ep-desc">Heartbeat / keep-alive</div></div></div>
    <div class="endpoint"><span class="method get">GET</span><div><div class="ep-path">/api/acars/live-map</div><div class="ep-desc">Active flights for live map (with stale cleanup)</div></div></div>
  </div>
  <div class="footer">Levant Virtual Airlines &nbsp;&middot;&nbsp; ${now}</div>
</div>
</body>
</html>`;
        return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders() } });
    } catch (error: any) {
        console.error('ACARS error [GET]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}

// POST — forward to dedicated action route
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { action } = body;

        const req = new Request(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        let res: Response;
        switch (action) {
            case 'auth':
                res = await (await import('@/app/api/acars/auth/route')).POST(req as any); break;
            case 'bid':
            case 'book':
            case 'cancel-bid':
                res = await (await import('@/app/api/acars/bid/route')).POST(req as any); break;
            case 'start':
                res = await (await import('@/app/api/acars/start/route')).POST(req as any); break;
            case 'position':
                res = await (await import('@/app/api/acars/position/route')).POST(req as any); break;
            case 'pirep':
                res = await (await import('@/app/api/acars/pirep/route')).POST(req as any); break;
            case 'end':
                res = await (await import('@/app/api/acars/end/route')).POST(req as any); break;
            case 'aircraft-health':
                res = await (await import('@/app/api/acars/aircraft-health/route')).POST(req as any); break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders() });
        }

        Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    } catch (error: any) {
        console.error('ACARS error [POST]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}
