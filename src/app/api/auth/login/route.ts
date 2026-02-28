import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';

export async function POST(request: NextRequest) {
    try {
        if (!process.env.MONGODB_URI) {
            return NextResponse.json({ error: 'Server misconfiguration: Database not configured' }, { status: 500 });
        }
        if (!process.env.JWT_SECRET) {
            return NextResponse.json({ error: 'Server misconfiguration: Auth secret not configured' }, { status: 500 });
        }

        await connectDB();
        
        const { email, password, hwid } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Fetch user from MongoDB
        const user = await Pilot.findOne({ email: email.toLowerCase() });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (user.status === 'Blacklist') {
            return NextResponse.json(
                { error: 'Your account has been blacklisted. Contact administrator.' },
                { status: 403 }
            );
        }

        // --- HWID Locking ---
        if (hwid) {
            if (!user.hwid) {
                user.hwid = hwid;
            } else if (user.hwid !== hwid) {
                return NextResponse.json(
                    { error: 'Security Alert: Device ID Mismatch. Account is locked to a different PC. Contact staff.' },
                    { status: 403 }
                );
            }
        }

        // Update last activity and restore status if needed
        user.last_activity = new Date();
        if (user.status === 'On leave (LOA)' || user.status === 'Inactive') user.status = 'Active';
        if (email.toLowerCase() === 'admin@levant-va.com') { user.is_admin = true; user.role = 'Admin'; }
        await user.save();

        // Create JWT payload
        const payload = {
            id: user._id.toString(),
            pilotId: user.pilot_id,
            isAdmin: user.is_admin === true || user.role === 'Admin',
            email: user.email,
            status: user.status,
            role: user.role,
        };

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        // Create response
        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                pilotId: user.pilot_id,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin: user.is_admin,
                role: user.role,
            }
        });

        // Set Cookie
        response.cookies.set('lva_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, 
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
