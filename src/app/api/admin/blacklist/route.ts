import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import { notifyBlacklist } from '@/lib/discord';
import { sendBlacklistNotificationEmail } from '@/lib/email';

// GET - List all blacklisted users
export async function GET() {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectDB();

        const blacklisted = await Pilot.find({ status: 'Blacklist' })
            .select('pilot_id first_name last_name email blacklist_reason blacklisted_by blacklisted_at created_at')
            .sort({ blacklisted_at: -1 })
            .lean();

        const entries = blacklisted.map((p: any) => ({
            id: p._id.toString(),
            pilotId: p.pilot_id,
            username: `${p.first_name} ${p.last_name}`,
            email: p.email,
            reason: p.blacklist_reason || 'No reason provided',
            adminId: p.blacklisted_by || 'Unknown',
            createdAt: p.blacklisted_at?.toISOString() || p.created_at?.toISOString() || '',
        }));

        return NextResponse.json({ success: true, entries });
    } catch (error: any) {
        console.error('Blacklist GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Add a user to the blacklist
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectDB();
        const { userId, reason } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID or Pilot ID is required' }, { status: 400 });
        }

        // Find by pilot_id or email
        const pilot = await Pilot.findOne({
            $or: [
                { pilot_id: userId },
                { email: userId.toLowerCase() },
            ]
        });

        if (!pilot) {
            return NextResponse.json({ error: `Pilot "${userId}" not found` }, { status: 404 });
        }

        if (pilot.status === 'Blacklist') {
            return NextResponse.json({ error: `${pilot.pilot_id} is already blacklisted` }, { status: 409 });
        }

        // Prevent blacklisting admins
        if (pilot.is_admin) {
            return NextResponse.json({ error: 'Cannot blacklist an administrator' }, { status: 403 });
        }

        pilot.status = 'Blacklist';
        pilot.blacklist_reason = reason || 'No reason provided';
        pilot.blacklisted_by = session.pilotId;
        pilot.blacklisted_at = new Date();
        await pilot.save();

        // Send Discord mod notification
        notifyBlacklist(
            `${pilot.first_name} ${pilot.last_name}`,
            pilot.pilot_id,
            reason || 'No reason provided',
            session.pilotId
        ).catch(() => {});

        // Send email notification to the blacklisted user
        if (pilot.email) {
            sendBlacklistNotificationEmail(
                pilot.email,
                pilot.pilot_id,
                pilot.first_name,
                reason || 'No reason provided'
            ).catch(() => {});
        }

        return NextResponse.json({
            success: true,
            message: `${pilot.pilot_id} (${pilot.first_name} ${pilot.last_name}) has been blacklisted`,
            entry: {
                id: pilot._id.toString(),
                pilotId: pilot.pilot_id,
                username: `${pilot.first_name} ${pilot.last_name}`,
                email: pilot.email,
                reason: pilot.blacklist_reason,
                adminId: session.pilotId,
                createdAt: pilot.blacklisted_at.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('Blacklist POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove a user from the blacklist (restore to Inactive)
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'User ID parameter is required' }, { status: 400 });
        }

        const pilot = await Pilot.findById(id);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        if (pilot.status !== 'Blacklist') {
            return NextResponse.json({ error: 'Pilot is not blacklisted' }, { status: 400 });
        }

        pilot.status = 'Inactive';
        pilot.blacklist_reason = undefined;
        pilot.blacklisted_by = undefined;
        pilot.blacklisted_at = undefined;
        await pilot.save();

        return NextResponse.json({
            success: true,
            message: `${pilot.pilot_id} (${pilot.first_name} ${pilot.last_name}) has been removed from the blacklist`,
        });
    } catch (error: any) {
        console.error('Blacklist DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
