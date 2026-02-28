import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLeg {
    leg_number: number;
    departure_icao?: string;
    arrival_icao?: string;
    flight_number?: string;
    aircraft_types?: string[];
    distance_nm?: number;
}

export interface IActivity extends Document {
    title: string;
    description: string;
    banner?: string;
    type: 'Event' | 'Tour';
    startDate: Date;
    endDate?: Date;
    legsInOrder: boolean;
    minRank?: string;
    badge_name?: string;
    badge_image?: string;
    reward_points: number;
    bonusXp: number;
    averageDaysToComplete?: number;
    firstPilotToComplete?: string;
    totalPilotsComplete: number;
    active: boolean;
    activityLegs: IActivityLeg[];
    created_at: Date;
}

const ActivityLegSchema = new Schema({
    leg_number: { type: Number, required: true },
    departure_icao: String,
    arrival_icao: String,
    flight_number: String,
    aircraft_types: [String],
    distance_nm: Number,
}, { _id: true });

const ActivitySchema = new Schema<IActivity>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: String,
    type: { type: String, enum: ['Event', 'Tour'], default: 'Event', index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    legsInOrder: { type: Boolean, default: false },
    minRank: String,
    badge_name: String,
    badge_image: String,
    reward_points: { type: Number, default: 0 },
    bonusXp: { type: Number, default: 0 },
    averageDaysToComplete: Number,
    firstPilotToComplete: String,
    totalPilotsComplete: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    activityLegs: [ActivityLegSchema],
    created_at: { type: Date, default: Date.now },
});

const Activity = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
export default Activity;
