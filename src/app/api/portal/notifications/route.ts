import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

// GET — Fetch notifications for the logged-in pilot
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const pilotObjectId = session.id;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const unreadOnly = searchParams.get('unread') === 'true';

    const filter: any = { pilot_id: pilotObjectId };
    if (unreadOnly) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ created_at: -1 })
            .limit(limit)
            .lean(),
        Notification.countDocuments({ pilot_id: pilotObjectId, read: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
}

// PATCH — Mark notifications as read
export async function PATCH(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const pilotObjectId = session.id;

    const body = await request.json();
    const { ids, markAll } = body;

    if (markAll) {
        await Notification.updateMany(
            { pilot_id: pilotObjectId, read: false },
            { $set: { read: true } }
        );
    } else if (ids && Array.isArray(ids)) {
        await Notification.updateMany(
            { _id: { $in: ids }, pilot_id: pilotObjectId },
            { $set: { read: true } }
        );
    }

    return NextResponse.json({ success: true });
}
