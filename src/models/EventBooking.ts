import mongoose, { Schema, Document } from 'mongoose';

export interface IEventBooking extends Document {
    event_id: mongoose.Types.ObjectId;
    pilot_id: mongoose.Types.ObjectId;
    booked_at: Date;
    status: 'booked' | 'attended' | 'cancelled';
    flight_id?: mongoose.Types.ObjectId;
    attended_at?: Date;
}

const EventBookingSchema = new Schema<IEventBooking>({
    event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    booked_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['booked', 'attended', 'cancelled'], default: 'booked', index: true },
    flight_id: { type: Schema.Types.ObjectId, ref: 'Flight', index: true },
    attended_at: { type: Date },
});

(EventBookingSchema as any).pre('validate', function (this: any, next: (err?: any) => void) {
    // Normalize legacy status values that may exist in DB.
    if (typeof this.status === 'string') {
        const s = this.status.toLowerCase();
        if (s === 'booked') this.status = 'booked';
        else if (s === 'attended') this.status = 'attended';
        else if (s === 'cancelled' || s === 'canceled') this.status = 'cancelled';
    }
    next();
});

EventBookingSchema.index({ event_id: 1, pilot_id: 1 }, { unique: true });

const EventBooking = mongoose.models.EventBooking || mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);
export default EventBooking;
