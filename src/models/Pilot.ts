import mongoose, { Schema, Document } from 'mongoose';

export interface IPilot extends Document {
    pilot_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone_number?: string;
    avatar_url?: string;
    rank: string;
    status: 'Active' | 'Inactive' | 'Blacklist' | 'Pending' | 'On leave (LOA)';
    role: 'Pilot' | 'Admin';
    hub_manager?: string;
    is_admin: boolean;
    total_hours: number;
    transfer_hours: number;
    total_flights: number;
    total_credits: number;
    landing_avg?: number;
    current_location: string;
    country: string;
    city?: string;
    timezone: string;
    desired_callsign?: string;
    simbrief_id?: string;
    last_activity?: Date;
    created_at: Date;
    balance: number;
    home_base: string;
    last_jumpseat?: Date;
    vatsim_cid?: string;
    ivao_vid?: string;
    hwid?: string;
    hoppie_code?: string;
    sim_mode?: 'fsuipc' | 'xpuipc';
    weight_unit?: 'lbs' | 'kgs';
    discord_id?: string;
    discord_username?: string;
    type_ratings: string[];
    inventory: string[];
    routes_flown: string[];
    last_flight_date?: Date;
    blacklist_reason?: string;
    blacklisted_by?: string;
    blacklisted_at?: Date;
}

const PilotSchema = new Schema<IPilot>({
    pilot_id: { type: String, required: true, unique: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    phone_number: String,
    avatar_url: String,
    rank: { type: String, default: 'Cadet' },
    status: { type: String, enum: ['Active', 'Inactive', 'Blacklist', 'Pending', 'On leave (LOA)'], default: 'Pending', index: true },
    role: { type: String, enum: ['Pilot', 'Admin'], default: 'Pilot' },
    hub_manager: String,
    is_admin: { type: Boolean, default: false },
    total_hours: { type: Number, default: 0 },
    transfer_hours: { type: Number, default: 0 },
    total_flights: { type: Number, default: 0 },
    total_credits: { type: Number, default: 0 },
    landing_avg: Number,
    current_location: { type: String, default: 'OJAI' },
    country: { type: String, required: true },
    city: String,
    timezone: { type: String, required: true },
    desired_callsign: String,
    simbrief_id: String,
    last_activity: Date,
    balance: { type: Number, default: 0 },
    home_base: { type: String, default: 'OJAI' },
    last_jumpseat: Date,
    vatsim_cid: String,
    ivao_vid: String,
    hwid: String,
    hoppie_code: String,
    sim_mode: { type: String, enum: ['fsuipc', 'xpuipc'], default: 'fsuipc' },
    weight_unit: { type: String, enum: ['lbs', 'kgs'], default: 'lbs' },
    discord_id: String,
    discord_username: String,
    type_ratings: [String],
    inventory: [String],
    routes_flown: [String],
    last_flight_date: Date,
    blacklist_reason: String,
    blacklisted_by: String,
    blacklisted_at: Date,
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

const Pilot = mongoose.models.Pilot || mongoose.model<IPilot>('Pilot', PilotSchema);
export default Pilot;
