import { NextResponse } from 'next/server';
import axios from 'axios';

const VATSIM_DATA_URL = 'https://data.vatsim.net/v3/vatsim-data.json';
let cachedData: any = null;
let lastFetch = 0;
const CACHE_DURATION = 15000; // 15 seconds

// Standardized VATSIM Route
export async function GET() {
    try {
        const now = Date.now();
        if (cachedData && now - lastFetch < CACHE_DURATION) {
            return NextResponse.json(cachedData);
        }

        const response = await axios.get(VATSIM_DATA_URL);
        const data = response.data;

        // Map to common format
        const pilots = data.pilots.map((p: any) => ({
            callsign: p.callsign,
            pilot_name: p.name || 'VATSIM Pilot',
            departure_icao: p.flight_plan?.departure || '????',
            arrival_icao: p.flight_plan?.arrival || '????',
            aircraft_type: p.flight_plan?.aircraft_short || 'ACFT',
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude,
            heading: p.heading,
            ground_speed: p.groundspeed,
            status: 'VATSIM', 
            network: 'VATSIM'
        }));

        cachedData = { success: true, pilots };
        lastFetch = now;

        return NextResponse.json(cachedData);
    } catch (error) {
        console.error('Error fetching VATSIM data:', error);
        return NextResponse.json({ error: 'Failed to fetch VATSIM data' }, { status: 500 });
    }
}
