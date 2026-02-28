import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';

export async function GET() {
    try {
        await connectDB();

        const adminEmail = 'admin@levant-va.com';

        // Check if admin exists
        const existing = await Pilot.findOne({ email: adminEmail });

        if (existing) {
            // Reset password
            const passwordHash = await bcrypt.hash('administrator', 10);
            existing.password = passwordHash;
            existing.is_admin = true;
            existing.role = 'Admin';
            existing.status = 'Active';
            await existing.save();
            return NextResponse.json({
                success: true,
                message: 'Admin password reset to default',
                pilotId: existing.pilot_id
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash('administrator', 10);

        // Create admin
        const admin = await Pilot.create({
            pilot_id: 'LVT0000',
            first_name: 'Admin',
            last_name: 'User',
            email: adminEmail,
            password: passwordHash,
            rank: 'Administrator',
            status: 'Active',
            role: 'Admin',
            is_admin: true,
            country: 'TH',
            city: 'Bangkok',
            timezone: 'Asia/Bangkok',
            current_location: 'OJAI',
        });

        return NextResponse.json({
            success: true,
            message: 'Default admin seeded successfully',
            pilotId: admin.pilot_id
        });

    } catch (error: any) {
        console.error('Setup error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
