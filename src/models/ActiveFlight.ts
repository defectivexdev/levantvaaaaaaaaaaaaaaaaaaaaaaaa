import mongoose, { Schema, Document } from 'mongoose';

export interface IActiveFlight extends Document {
    pilot_id: mongoose.Types.ObjectId;
    pilot_name: string;
    callsign: string;
    departure_icao?: string;
    arrival_icao?: string;
    aircraft_type?: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    ground_speed: number;
    ias: number;
    vertical_speed: number;
    phase: string;
    fuel: number;
    engines: number;
    lights: number;
    pitch: number;
    bank: number;
    g_force: number;
    comfort_score: number;
    status: string;
    takeoff_notified: boolean;
    started_at: Date;
    last_update: Date;
}

const ActiveFlightSchema = new Schema<IActiveFlight>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    pilot_name: { type: String, required: true },
    callsign: { type: String, required: true, index: true },
    departure_icao: String,
    arrival_icao: String,
    aircraft_type: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitude: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    ground_speed: { type: Number, default: 0 },
    ias: { type: Number, default: 0 },
    vertical_speed: { type: Number, default: 0 },
    phase: { type: String, default: 'Preflight' },
    fuel: { type: Number, default: 0 },
    engines: { type: Number, default: 0 },
    lights: { type: Number, default: 0 },
    pitch: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    g_force: { type: Number, default: 1.0 },
    comfort_score: { type: Number, default: 100 },
    status: { type: String, default: 'Preflight', index: true },
    takeoff_notified: { type: Boolean, default: false },
    started_at: { type: Date, default: Date.now },
    last_update: { type: Date, default: Date.now, index: true },
});

const ActiveFlight = mongoose.models.ActiveFlight || mongoose.model<IActiveFlight>('ActiveFlight', ActiveFlightSchema);
export default ActiveFlight;
