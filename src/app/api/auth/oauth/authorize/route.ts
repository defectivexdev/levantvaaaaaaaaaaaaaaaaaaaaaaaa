import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import PendingAuth from '@/models/PendingAuth';
import { verifyAuth } from '@/lib/auth';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/auth/oauth/authorize — Redirect-based: user visits this in browser
// Query params: code_challenge, code_challenge_method, redirect_uri, state
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const codeChallenge = searchParams.get('code_challenge');
    const challengeMethod = searchParams.get('code_challenge_method') || 'S256';
    const redirectUri = searchParams.get('redirect_uri') || 'levant-acars://callback';
    const state = searchParams.get('state') || '';

    if (!codeChallenge) {
        return NextResponse.json({ error: 'code_challenge is required for PKCE' }, { status: 400 });
    }

    // Verify user is logged in via cookie
    const session = await verifyAuth();
    if (!session) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(request.url);
        return NextResponse.redirect(new URL(`/login?redirect=${returnUrl}`, request.url));
    }

    // Check blacklist
    await connectDB();
    const pilot = await Pilot.findOne({ pilot_id: session.pilotId });
    if (!pilot || pilot.status === 'Blacklist') {
        return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
    }

    // Generate a short-lived authorization code
    const authCode = crypto.randomBytes(32).toString('hex');

    await PendingAuth.create({
        code: authCode,
        type: 'oauth',
        status: 'pending',
        pilot_id: session.pilotId,
        code_challenge: codeChallenge,
        challenge_method: challengeMethod,
        redirect_uri: redirectUri,
        expires_at: new Date(Date.now() + CODE_TTL_MS),
    });

    // Redirect back to the ACARS app with the auth code
    const callbackUrl = `${redirectUri}?code=${authCode}${state ? `&state=${state}` : ''}`;
    return NextResponse.redirect(callbackUrl);
}

// POST /api/auth/oauth/authorize — API-based: for the web authorize page
// Body: { code_challenge, redirect_uri }
// Returns: { auth_code } for manual redirect
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { code_challenge, code_challenge_method, redirect_uri } = await request.json();

    if (!code_challenge) {
        return NextResponse.json({ error: 'code_challenge required' }, { status: 400 });
    }

    await connectDB();
    const pilot = await Pilot.findOne({ pilot_id: session.pilotId });
    if (!pilot || pilot.status === 'Blacklist') {
        return NextResponse.json({ error: 'Account blacklisted' }, { status: 403 });
    }

    const authCode = crypto.randomBytes(32).toString('hex');

    await PendingAuth.create({
        code: authCode,
        type: 'oauth',
        status: 'pending',
        pilot_id: session.pilotId,
        code_challenge: code_challenge,
        challenge_method: code_challenge_method || 'S256',
        redirect_uri: redirect_uri || 'levant-acars://callback',
        expires_at: new Date(Date.now() + CODE_TTL_MS),
    });

    return NextResponse.json({
        auth_code: authCode,
        redirect_uri: `${redirect_uri || 'levant-acars://callback'}?code=${authCode}`,
    });
}
