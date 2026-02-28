import Notification from '@/models/Notification';
import connectDB from '@/lib/database';
import mongoose from 'mongoose';

type NotificationType = 'pirep_approved' | 'pirep_rejected' | 'rank_up' | 'award' | 'event' | 'system' | 'tour';

interface CreateNotificationParams {
    pilotId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

export async function createNotification({ pilotId, type, title, message, link }: CreateNotificationParams) {
    await connectDB();
    return Notification.create({
        pilot_id: typeof pilotId === 'string' ? new mongoose.Types.ObjectId(pilotId) : pilotId,
        type,
        title,
        message,
        link,
    });
}

export async function createBulkNotifications(
    pilotIds: (string | mongoose.Types.ObjectId)[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string
) {
    await connectDB();
    const docs = pilotIds.map(id => ({
        pilot_id: typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id,
        type,
        title,
        message,
        link,
    }));
    return Notification.insertMany(docs);
}
