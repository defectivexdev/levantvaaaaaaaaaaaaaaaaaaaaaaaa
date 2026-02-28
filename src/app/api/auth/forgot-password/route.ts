import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import PasswordReset from '@/models/PasswordReset';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await Pilot.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ 
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.' 
            });
        }

        // Generate reset token
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Delete any existing tokens for this email
        await PasswordReset.deleteMany({ email: email.toLowerCase() });

        // Create new reset token
        await PasswordReset.create({
            email: email.toLowerCase(),
            token,
            expires_at: expiresAt,
        });

        // Send password reset email
        try {
            await sendPasswordResetEmail(email, token);
            console.log('Password reset email sent successfully to:', email);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Don't fail the request - token is still valid
        }

        return NextResponse.json({ 
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.' 
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
