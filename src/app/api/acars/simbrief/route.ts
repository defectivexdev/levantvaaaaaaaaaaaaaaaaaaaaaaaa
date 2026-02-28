import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    try {
        const { pilotId } = await request.json();
        
        if (!pilotId) {
            return NextResponse.json({ error: 'Pilot ID required' }, { status: 400 });
        }

        await connectDB();
        const pilot = await PilotModel.findOne({ pilot_id: pilotId }).lean();

        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        const simbriefId = pilot.simbrief_id;
        console.log(`[SimBrief] Pilot ${pilotId} has SimBrief ID:`, simbriefId);
        
        if (!simbriefId) {
            return NextResponse.json({ 
                error: 'SimBrief ID not configured. Please add your SimBrief ID in Settings.',
                simbriefId: null
            }, { status: 400 });
        }

        // Fetch latest SimBrief OFP
        const sbUrl = `https://www.simbrief.com/api/xml.fetcher.php?userid=${simbriefId}&json=v2`;
        console.log(`[SimBrief] Fetching from:`, sbUrl);
        
        const sbRes = await fetch(sbUrl, { 
            cache: 'no-store',
            headers: {
                'User-Agent': 'LevantVA-ACARS/1.0'
            }
        });

        console.log(`[SimBrief] Response status:`, sbRes.status);

        if (!sbRes.ok) {
            console.error(`[SimBrief] HTTP error ${sbRes.status} for SimBrief ID ${simbriefId}`);
            return NextResponse.json({ 
                error: `SimBrief API returned error ${sbRes.status}. Check your SimBrief ID: ${simbriefId}`,
                simbriefId
            }, { status: 500 });
        }

        const sbData = await sbRes.json();
        console.log(`[SimBrief] Response status from API:`, sbData?.fetch?.status);

        if (sbData?.fetch?.status !== 'Success') {
            console.error(`[SimBrief] No flight plan found. Status:`, sbData?.fetch?.status);
            return NextResponse.json({ 
                error: `No SimBrief flight plan found for SimBrief ID: ${simbriefId}. Create a flight plan on SimBrief.com first.`,
                simbriefId,
                details: sbData?.fetch?.status || 'Unknown status'
            }, { status: 404 });
        }
        
        console.log(`[SimBrief] Successfully fetched flight plan: ${sbData.origin?.icao_code} → ${sbData.destination?.icao_code}`);

        // Extract flight plan data
        const flightPlan = {
            callsign: sbData.atc?.callsign || `${pilot.pilot_id}`,
            flightNumber: sbData.general?.flight_number || sbData.atc?.callsign || '',
            departureIcao: sbData.origin?.icao_code || '',
            arrivalIcao: sbData.destination?.icao_code || '',
            departureName: sbData.origin?.name || '',
            arrivalName: sbData.destination?.name || '',
            alternateIcao: sbData.alternate?.icao_code || '',
            alternateName: sbData.alternate?.name || '',
            aircraftType: sbData.aircraft?.icaocode || '',
            aircraftRegistration: sbData.aircraft?.reg || '',
            route: sbData.general?.route || '',
            pax: parseInt(sbData.weights?.pax_count || '0'),
            cargo: parseInt(sbData.weights?.cargo || '0'),
            cruiseAltitude: parseInt(sbData.general?.initial_altitude || '0'),
            flightTime: sbData.times?.est_time_enroute || '',
            distance: parseInt(sbData.general?.air_distance || '0'),
            fuel: parseInt(sbData.fuel?.plan_ramp || '0'),
            // Weather
            originMetar: sbData.weather?.orig_metar || '',
            destMetar: sbData.weather?.dest_metar || '',
            altnMetar: sbData.weather?.altn_metar || '',
            // Timestamps
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        return NextResponse.json({ flightPlan, simbriefId });
    } catch (error: any) {
        console.error('SimBrief fetch error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch SimBrief flight plan',
            details: error.message 
        }, { status: 500 });
    }
}
