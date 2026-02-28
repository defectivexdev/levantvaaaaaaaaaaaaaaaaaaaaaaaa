import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear the auth cookie
    response.cookies.set('lva_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // Expire immediately
    });

    return response;
}
