import mongoose, { Schema, Document } from 'mongoose';

export interface IAward extends Document {
    name: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    linkedTourId?: mongoose.Types.ObjectId;
    requiredValue?: number;
    active: boolean;
    order: number;
    createdAt: Date;
}

const AwardSchema = new Schema<IAward>({
    name: { type: String, required: true, index: true },
    description: String,
    imageUrl: String,
    category: { type: String, default: 'Special' },
    linkedTourId: { type: Schema.Types.ObjectId, ref: 'Tour', default: null },
    requiredValue: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const Award = mongoose.models.Award || mongoose.model<IAward>('Award', AwardSchema);
export default Award;
