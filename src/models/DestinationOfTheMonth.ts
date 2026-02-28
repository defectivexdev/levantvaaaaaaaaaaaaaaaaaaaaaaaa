import mongoose, { Schema, Document } from 'mongoose';

export interface IDestinationOfTheMonth extends Document {
    month: string;
    year: number;
    airport_icao: string;
    bonus_percentage: number;
    bonus_points: number;
    description?: string;
    banner_image?: string;
    is_active: boolean;
    created_at: Date;
}

const DestinationOfTheMonthSchema = new Schema<IDestinationOfTheMonth>({
    month: { type: String, required: true },
    year: { type: Number, required: true },
    airport_icao: { type: String, required: true, index: true },
    bonus_percentage: { type: Number, default: 0 },
    bonus_points: { type: Number, default: 0 },
    description: String,
    banner_image: String,
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
});

DestinationOfTheMonthSchema.index({ month: 1, year: 1 }, { unique: true });

const DestinationOfTheMonth = mongoose.models.DestinationOfTheMonth || mongoose.model<IDestinationOfTheMonth>('DestinationOfTheMonth', DestinationOfTheMonthSchema);
export default DestinationOfTheMonth;
