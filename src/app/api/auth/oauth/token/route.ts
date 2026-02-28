import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import PendingAuth from '@/models/PendingAuth';

const JWT_SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET || '');

// Verify PKCE: hash the verifier with SHA-256 and compare to the stored challenge
function verifyPKCE(verifier: string, challenge: string, method: string): boolean {
    if (method !== 'S256') return false;
    const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
    return hash === challenge;
}

// POST /api/auth/oauth/token — Exchange authorization code + PKCE verifier for tokens
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { grant_type, code, code_verifier, redirect_uri, refresh_token } = body;

    // --- Refresh Token Grant ---
    if (grant_type === 'refresh_token') {
        if (!refresh_token) {
            return NextResponse.json({ error: 'refresh_token required' }, { status: 400 });
        }

        try {
            const { payload } = await jwtVerify(refresh_token, JWT_SECRET());
            if (payload.type !== 'refresh') {
                return NextResponse.json({ error: 'Invalid token type' }, { status: 400 });
            }

            await connectDB();
            const pilot = await Pilot.findOne({ pilot_id: payload.pilotId as string });
            if (!pilot || pilot.status === 'Blacklist') {
                return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
            }

            const tokens = await generateTokens(pilot);
            return NextResponse.json(tokens);
        } catch {
            return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
        }
    }

    // --- Authorization Code Grant ---
    if (grant_type !== 'authorization_code') {
        return NextResponse.json({ error: 'Unsupported grant_type' }, { status: 400 });
    }

    if (!code || !code_verifier) {
        return NextResponse.json({ error: 'code and code_verifier are required' }, { status: 400 });
    }

    // Look up the pending authorization code
    await connectDB();
    const pending = await PendingAuth.findOne({ code, type: 'oauth' });
    if (!pending) {
        return NextResponse.json({ error: 'Invalid or expired authorization code' }, { status: 400 });
    }

    // Check expiry
    if (new Date() > pending.expires_at) {
        await PendingAuth.deleteOne({ _id: pending._id });
        return NextResponse.json({ error: 'Authorization code expired' }, { status: 400 });
    }

    // Verify PKCE
    if (!verifyPKCE(code_verifier, pending.code_challenge || '', pending.challenge_method || 'S256')) {
        await PendingAuth.deleteOne({ _id: pending._id });
        return NextResponse.json({ error: 'PKCE verification failed' }, { status: 400 });
    }

    // Verify redirect_uri matches
    if (redirect_uri && redirect_uri !== pending.redirect_uri) {
        await PendingAuth.deleteOne({ _id: pending._id });
        return NextResponse.json({ error: 'redirect_uri mismatch' }, { status: 400 });
    }

    // Code is valid — consume it (one-time use)
    await PendingAuth.deleteOne({ _id: pending._id });

    // Fetch pilot data
    const pilot = await Pilot.findOne({ pilot_id: pending.pilot_id });
    if (!pilot) {
        return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
    }

    if (pilot.status === 'Blacklist') {
        return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
    }

    // Restore status if LOA/Inactive
    if (pilot.status === 'On leave (LOA)' || pilot.status === 'Inactive') {
        pilot.status = 'Active';
        await pilot.save();
    }

    const tokens = await generateTokens(pilot);

    return NextResponse.json({
        ...tokens,
        pilot: {
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
            simbriefId: pilot.simbrief_id || '',
            avatarUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ''}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/avatars/pilot_${pilot.pilot_id}`,
        },
    });
}

async function generateTokens(pilot: any) {
    const now = Math.floor(Date.now() / 1000);

    const access_token = await new SignJWT({
        pilotId: pilot.pilot_id,
        sub: pilot._id.toString(),
        type: 'access',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + 3600) // 1 hour
        .sign(JWT_SECRET());

    const refresh_token = await new SignJWT({
        pilotId: pilot.pilot_id,
        sub: pilot._id.toString(),
        type: 'refresh',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + 30 * 24 * 3600) // 30 days
        .sign(JWT_SECRET());

    return {
        access_token,
        refresh_token,
        token_type: 'Bearer',
        expires_in: 3600,
    };
}
