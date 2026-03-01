import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import bcrypt from 'bcryptjs';
import { findPilot, corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const { pilotId, password } = await request.json();

        if (!pilotId || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400, headers: corsHeaders() });
        }

        const pilot = await findPilot(pilotId);
        if (pilot) {
            const valid = await bcrypt.compare(password, pilot.password);
            if (valid) {
                const sessionToken = Buffer.from(`${pilotId}:${Date.now()}`).toString('base64');

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
                        avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ''}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`
                    },
                }, { headers: corsHeaders() });
            }
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders() });
    } catch (error: any) {
        console.error('[ACARS Auth]', error);
        return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}
