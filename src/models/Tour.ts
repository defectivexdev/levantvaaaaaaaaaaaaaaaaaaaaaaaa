import mongoose, { Schema, Document } from 'mongoose';

export interface ITourLeg {
    leg_number: number;
    departure_icao: string;
    arrival_icao: string;
    distance_nm: number;
}

export interface ITour extends Document {
    name: string;
    description: string;
    image?: string;
    banner?: string;
    award_image?: string;
    legs: ITourLeg[];
    total_distance: number;
    reward_credits: number;
    reward_badge?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    active: boolean;
    start_date?: Date;
    end_date?: Date;
    created_at: Date;
}

const TourLegSchema = new Schema({
    leg_number: { type: Number, required: true },
    departure_icao: { type: String, required: true },
    arrival_icao: { type: String, required: true },
    distance_nm: { type: Number, default: 0 },
}, { _id: false });

const TourSchema = new Schema<ITour>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: String,
    banner: String,
    award_image: String,
    legs: { type: [TourLegSchema], default: [] },
    total_distance: { type: Number, default: 0 },
    reward_credits: { type: Number, default: 0 },
    reward_badge: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    active: { type: Boolean, default: true, index: true },
    start_date: Date,
    end_date: Date,
    created_at: { type: Date, default: Date.now },
});

const Tour = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);
export default Tour;
