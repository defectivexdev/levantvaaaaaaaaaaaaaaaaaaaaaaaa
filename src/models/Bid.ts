import mongoose, { Schema, Document } from 'mongoose';

export interface IBid extends Document {
    pilot_id: mongoose.Types.ObjectId;
    pilot_name: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    aircraft_type: string;
    aircraft_registration?: string;
    route?: string;
    estimated_flight_time?: number;
    pax?: number;
    cargo?: number;
    planned_fuel?: number;
    rotation_speed?: number;
    simbrief_ofp_id?: string;
    activity_id?: mongoose.Types.ObjectId;
    status: 'Active' | 'InProgress' | 'Completed' | 'Cancelled';
    created_at: Date;
    expires_at: Date;
}

const BidSchema = new Schema<IBid>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    pilot_name: { type: String, required: true },
    callsign: { type: String, required: true },
    departure_icao: { type: String, required: true },
    arrival_icao: { type: String, required: true },
    aircraft_type: { type: String, required: true },
    aircraft_registration: String,
    route: String,
    estimated_flight_time: Number,
    pax: Number,
    cargo: Number,
    planned_fuel: Number,
    rotation_speed: Number,
    simbrief_ofp_id: String,
    activity_id: { type: Schema.Types.ObjectId, ref: 'Activity' },
    status: { type: String, enum: ['Active', 'InProgress', 'Completed', 'Cancelled'], default: 'Active', index: true },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
});

const Bid = mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema);
export default Bid;
