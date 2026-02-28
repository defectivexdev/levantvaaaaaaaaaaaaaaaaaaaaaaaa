import mongoose, { Schema, Document } from 'mongoose';

export interface IFleet extends Document {
    registration: string;
    aircraft_type: string;
    name?: string;
    livery?: string;
    current_location: string;
    status: 'Available' | 'InFlight' | 'Maintenance' | 'Grounded' | 'Retired';
    condition: number;
    total_hours: number;
    flight_count: number;
    is_active: boolean;
    last_service?: Date;
    grounded_reason?: string;
    damage_log: Array<{ type: string; amount: number; timestamp: Date; flight_id?: string }>;
    repair_until?: Date;
    damaged_at?: Date;
    damaged_by_pilot?: string;
    damaged_by_flight?: string;
    created_at: Date;
}

const FleetSchema = new Schema<IFleet>({
    registration: { type: String, required: true, unique: true, index: true },
    aircraft_type: { type: String, required: true, index: true },
    name: String,
    livery: String,
    current_location: { type: String, default: 'OJAI' },
    status: { type: String, enum: ['Available', 'InFlight', 'Maintenance', 'Grounded', 'Retired'], default: 'Available', index: true },
    condition: { type: Number, default: 100, min: 0, max: 100 },
    total_hours: { type: Number, default: 0 },
    flight_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    last_service: Date,
    grounded_reason: String,
    damage_log: [{ type: String, amount: Number, timestamp: { type: Date, default: Date.now }, flight_id: String }],
    repair_until: Date,
    damaged_at: Date,
    damaged_by_pilot: String,
    damaged_by_flight: String,
    created_at: { type: Date, default: Date.now },
});

const Fleet = mongoose.models.Fleet || mongoose.model<IFleet>('Fleet', FleetSchema);
export default Fleet;
