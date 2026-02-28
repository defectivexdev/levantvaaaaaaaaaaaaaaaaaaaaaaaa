import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    title: string;
    description: string;
    banner?: string;
    start_datetime?: Date;
    end_datetime?: Date;
    location?: string;
    max_participants?: number;
    reward_points: number;
    is_active: boolean;
    created_at: Date;

    // Newer events module fields (used by UI/admin)
    banner_image?: string;
    type?: string;
    start_time?: Date;
    end_time?: Date;
    airports?: string[];
    slots_available?: number;
}

const EventSchema = new Schema<IEvent>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: String,
    start_datetime: { type: Date, index: true },
    end_datetime: { type: Date, index: true },
    location: String,
    max_participants: Number,
    reward_points: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },

    banner_image: { type: String },
    type: { type: String, default: 'Fly-In', index: true },
    start_time: { type: Date, index: true },
    end_time: { type: Date, index: true },
    airports: { type: [String], default: [] },
    slots_available: { type: Number, default: 0 },
});

(EventSchema as any).pre('validate', function (this: any, next: (err?: any) => void) {
    // Keep legacy and new date fields in sync.
    // UI/admin uses start_time/end_time; older code used start_datetime/end_datetime.
    if (this.start_time && !this.start_datetime) this.start_datetime = this.start_time;
    if (this.start_datetime && !this.start_time) this.start_time = this.start_datetime;
    if (this.end_time && !this.end_datetime) this.end_datetime = this.end_time;
    if (this.end_datetime && !this.end_time) this.end_time = this.end_datetime;

    // Keep legacy banner and new banner_image in sync.
    if (this.banner_image && !this.banner) this.banner = this.banner_image;
    if (this.banner && !this.banner_image) this.banner_image = this.banner;

    // Keep slots/max participants in sync.
    if (typeof this.slots_available === 'number' && this.slots_available > 0 && !this.max_participants) {
        this.max_participants = this.slots_available;
    }
    if (typeof this.max_participants === 'number' && this.max_participants > 0 && !this.slots_available) {
        this.slots_available = this.max_participants;
    }

    next();
});

const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
