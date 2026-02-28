import mongoose, { Schema, Document } from 'mongoose';

export interface IRank extends Document {
    name: string;
    description?: string;
    requirement_hours: number;
    requirement_flights: number;
    auto_promote: boolean;
    allowed_aircraft: string[];
    image_url?: string;
    order: number;
}

const RankSchema = new Schema<IRank>({
    name: { type: String, required: true, unique: true, index: true },
    description: String,
    requirement_hours: { type: Number, default: 0 },
    requirement_flights: { type: Number, default: 0 },
    auto_promote: { type: Boolean, default: true },
    allowed_aircraft: [String],
    image_url: String,
    order: { type: Number, default: 0, index: true },
});

const Rank = mongoose.models.Rank || mongoose.model<IRank>('Rank', RankSchema);
export default Rank;
