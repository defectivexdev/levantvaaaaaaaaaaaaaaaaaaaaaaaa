import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import PendingAuth from '@/models/PendingAuth';
import { verifyAuth } from '@/lib/auth';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Generate a short, human-readable code (e.g., "LVA-A3B7K2")
function generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I to avoid confusion
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return `LVA-${code}`;
}

// POST — ACARS app requests a new device code
export async function POST() {
    await connectDB();
    const userCode = generateUserCode();

    await PendingAuth.create({
        code: userCode,
        type: 'device',
        status: 'pending',
        expires_at: new Date(Date.now() + CODE_TTL_MS),
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://levant-va.com';

    return NextResponse.json({
        device_code: userCode,
        user_code: userCode,
        authorize_url: `${siteUrl}/auth/acars-authorize?code=${userCode}`,
        verification_uri: `${siteUrl}/auth/acars-authorize`,
        expires_in: 300,
        poll_interval: 2,
    });
}

// GET — ACARS app polls for authorization status
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
        return NextResponse.json({ error: 'Missing device code' }, { status: 400 });
    }

    await connectDB();
    const entry = await PendingAuth.findOne({ code, type: 'device' });

    if (!entry) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 });
    }

    if (new Date() > entry.expires_at) {
        await PendingAuth.deleteOne({ _id: entry._id });
        return NextResponse.json({ error: 'Code expired' }, { status: 410 });
    }

    if (entry.status === 'pending') {
        return NextResponse.json({ status: 'pending' });
    }

    // Authorized — return pilot data and clean up
    await PendingAuth.deleteOne({ _id: entry._id });
    return NextResponse.json({
        status: 'authorized',
        success: true,
        sessionToken: entry.session_token,
        pilot: entry.pilot_data,
    });
}

// PUT — Web browser authorizes a device code (user is logged in via cookie)
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Not authenticated. Please log in first.' }, { status: 401 });
    }

    const { device_code } = await request.json();
    if (!device_code) {
        return NextResponse.json({ error: 'Missing device code' }, { status: 400 });
    }

    await connectDB();
    const entry = await PendingAuth.findOne({ code: device_code, type: 'device' });
    if (!entry) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 });
    }

    if (new Date() > entry.expires_at) {
        await PendingAuth.deleteOne({ _id: entry._id });
        return NextResponse.json({ error: 'Code expired' }, { status: 410 });
    }

    // Fetch full pilot data
    const pilot = await Pilot.findOne({ pilot_id: session.pilotId });
    if (!pilot) {
        return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
    }

    if (pilot.status === 'Blacklist') {
        return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
    }

    const sessionToken = Buffer.from(`${pilot.pilot_id}:${Date.now()}`).toString('base64');

    // Mark as authorized with pilot data
    entry.status = 'authorized';
    entry.session_token = sessionToken;
    entry.pilot_data = {
        id: pilot._id.toString(),
        pilotId: pilot.pilot_id,
        callsign: pilot.desired_callsign || pilot.pilot_id,
        name: `${pilot.first_name} ${pilot.last_name}`,
        rank: pilot.rank,
        totalHours: pilot.total_hours,
        firstName: pilot.first_name,
        lastName: pilot.last_name,
        hoppieCode: pilot.hoppie_code || '',
        simMode: pilot.sim_mode || 'fsuipc',
        weightUnit: pilot.weight_unit || 'lbs',
        simbriefId: pilot.simbrief_id || '',
        avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ''}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`,
    };
    await entry.save();

    // Restore status if LOA/Inactive
    if (pilot.status === 'On leave (LOA)' || pilot.status === 'Inactive') {
        pilot.status = 'Active';
        await pilot.save();
    }

    return NextResponse.json({ success: true, message: 'ACARS authorized' });
}
