import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';

export interface AuthSession {
    id: string;
    pilotId: string;
    isAdmin: boolean;
    email: string;
}

/**
 * Verifies the authentication token from cookies and returns the session data.
 * Resolves the pilot's actual MongoDB _id to handle stale JWT ids.
 * Returns null if the token is missing, invalid, or expired.
 */
export async function verifyAuth(): Promise<AuthSession | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('lva_session')?.value;

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secret);

        const jwtId = payload.id as string;
        const jwtPilotId = payload.pilotId as string;

        // Resolve actual DB _id: try JWT id first, fallback to pilot_id string lookup
        await connectDB();
        let pilot = await Pilot.findById(jwtId).select('_id pilot_id').lean();
        if (!pilot && jwtPilotId) {
            pilot = await Pilot.findOne({ pilot_id: jwtPilotId }).select('_id pilot_id').lean();
        }

        const resolvedId = pilot ? (pilot._id as any).toString() : jwtId;

        return {
            id: resolvedId,
            pilotId: jwtPilotId,
            isAdmin: payload.isAdmin as boolean,
            email: payload.email as string,
        };
    } catch {
        return null;
    }
}
