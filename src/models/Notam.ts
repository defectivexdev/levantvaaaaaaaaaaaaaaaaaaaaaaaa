import mongoose, { Schema, Document } from 'mongoose';

export interface INotam extends Document {
    title: string;
    content: string;
    type: 'General' | 'Airport' | 'Route' | 'Aircraft';
    airport_icao?: string;
    effective_from: Date;
    effective_until?: Date;
    is_active: boolean;
    created_at: Date;
}

const NotamSchema = new Schema<INotam>({
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['General', 'Airport', 'Route', 'Aircraft'], default: 'General', index: true },
    airport_icao: { type: String, index: true },
    effective_from: { type: Date, required: true, index: true },
    effective_until: { type: Date, index: true },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
});

const Notam = mongoose.models.Notam || mongoose.model<INotam>('Notam', NotamSchema);
export default Notam;
