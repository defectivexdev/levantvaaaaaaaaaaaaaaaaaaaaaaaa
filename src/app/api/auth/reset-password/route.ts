import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import PasswordReset from '@/models/PasswordReset';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Find valid token
        const resetRecord = await PasswordReset.findOne({
            token,
            expires_at: { $gt: new Date() }
        });

        if (!resetRecord) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password
        await Pilot.updateOne(
            { email: resetRecord.email },
            { password: hashedPassword }
        );

        // Delete used token
        await PasswordReset.deleteOne({ _id: resetRecord.id });

        return NextResponse.json({ 
            success: true,
            message: 'Password has been reset successfully' 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
