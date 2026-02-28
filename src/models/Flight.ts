import mongoose, { Schema, Document } from 'mongoose';

export interface IFlight extends Document {
    pilot_id: mongoose.Types.ObjectId;
    pilot_name: string;
    flight_number: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    alternate_icao?: string;
    route?: string;
    aircraft_type: string;
    flight_time: number;
    fuel_used: number;
    distance: number;
    landing_rate: number;
    landing_grade?: string;
    max_g_force?: number;
    pax: number;
    cargo: number;
    score: number;
    revenue_passenger: number;
    revenue_cargo: number;
    expense_fuel: number;
    expense_airport: number;
    expense_pilot: number;
    expense_maintenance: number;
    real_profit: number;
    passenger_rating: number;
    passenger_review?: string;
    deductions: Array<{ reason: string; penalty: number; timestamp: Date }>;
    telemetry?: any;
    comfort_score: number;
    log?: any;
    approved_status: number;
    comments?: string;
    admin_comments?: string;
    credits_earned?: number;
    credits_breakdown?: string[];
    acars_version: string;
    is_manual: boolean;
    tracker_link?: string;
    proof_image?: string;
    submitted_at: Date;
    reviewed_at?: Date;
    reviewed_by?: mongoose.Types.ObjectId;

    event_id?: mongoose.Types.ObjectId;
}

const FlightSchema = new Schema<IFlight>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    pilot_name: { type: String, required: true },
    flight_number: { type: String, required: true, index: true },
    callsign: { type: String, required: true },
    departure_icao: { type: String, required: true, index: true },
    arrival_icao: { type: String, required: true, index: true },
    alternate_icao: String,
    route: String,
    aircraft_type: { type: String, required: true },
    flight_time: { type: Number, required: true },
    fuel_used: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    landing_rate: { type: Number, required: true },
    landing_grade: { type: String, enum: ['Butter', 'Smooth', 'Acceptable', 'Firm', 'Hard'], default: 'Acceptable' },
    max_g_force: { type: Number, default: 1.0 },
    pax: { type: Number, default: 0 },
    cargo: { type: Number, default: 0 },
    score: { type: Number, default: 100 },
    revenue_passenger: { type: Number, default: 0 },
    revenue_cargo: { type: Number, default: 0 },
    expense_fuel: { type: Number, default: 0 },
    expense_airport: { type: Number, default: 0 },
    expense_pilot: { type: Number, default: 0 },
    expense_maintenance: { type: Number, default: 0 },
    real_profit: { type: Number, default: 0 },
    passenger_rating: { type: Number, default: 0 },
    passenger_review: String,
    deductions: [{ reason: String, penalty: Number, timestamp: Date }],
    telemetry: Schema.Types.Mixed,
    comfort_score: { type: Number, default: 100 },
    log: Schema.Types.Mixed,
    approved_status: { type: Number, default: 0, index: true },
    comments: String,
    admin_comments: String,
    credits_earned: { type: Number, default: 0 },
    credits_breakdown: [String],
    acars_version: { type: String, default: '1.0.0' },
    is_manual: { type: Boolean, default: false, index: true },
    tracker_link: String,
    proof_image: String,
    submitted_at: { type: Date, default: Date.now, index: true },
    reviewed_at: Date,
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'Pilot' },

    event_id: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
});

const Flight = mongoose.models.Flight || mongoose.model<IFlight>('Flight', FlightSchema);
export default Flight;
