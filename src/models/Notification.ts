import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    pilot_id: mongoose.Types.ObjectId;
    type: 'pirep_approved' | 'pirep_rejected' | 'rank_up' | 'award' | 'event' | 'system' | 'tour';
    title: string;
    message: string;
    link?: string;
    read: boolean;
    created_at: Date;
}

const NotificationSchema = new Schema<INotification>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    type: {
        type: String,
        enum: ['pirep_approved', 'pirep_rejected', 'rank_up', 'award', 'event', 'system', 'tour'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now },
});

// Auto-delete notifications older than 30 days
NotificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
