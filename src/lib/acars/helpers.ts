import Pilot from '@/models/Pilot';
import GlobalConfig from '@/models/GlobalConfig';

// In-memory position cache for slew detection (pilotId → last snapshot)
export const positionCache = new Map<string, { lat: number; lon: number; ts: number }>();
export const SLEW_DISTANCE_NM = 10;
export const SLEW_TIME_MS = 30000;

// CORS helper
export function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// Helper to find pilot by pilot_id, email, or MongoDB _id
export async function findPilot(pilotId: string) {
    let pilot = await Pilot.findOne({
        $or: [
            { pilot_id: pilotId },
            { email: pilotId.toLowerCase() }
        ]
    });
    if (!pilot) {
        pilot = await Pilot.findOne({ pilot_id: { $regex: new RegExp(`^${pilotId}$`, 'i') } });
    }
    if (!pilot && /^[0-9a-fA-F]{24}$/.test(pilotId)) {
        pilot = await Pilot.findById(pilotId);
    }
    return pilot;
}

// Haversine formula: returns distance in nautical miles
export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Get or create GlobalConfig
export async function getConfig() {
    let config = await GlobalConfig.findOne({ key: 'LVT_MAIN' });
    if (!config) {
        config = await GlobalConfig.create({ key: 'LVT_MAIN' });
    }
    return config;
}
