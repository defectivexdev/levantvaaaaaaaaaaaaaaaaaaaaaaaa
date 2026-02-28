import mongoose, { Schema, Document } from 'mongoose';

export interface IVersionSummary extends Document {
    version: string;
    release_date: Date;
    changelog?: string;
    is_current: boolean;
    created_at: Date;
}

const VersionSummarySchema = new Schema<IVersionSummary>({
    version: { type: String, required: true, unique: true, index: true },
    release_date: { type: Date, required: true, index: true },
    changelog: String,
    is_current: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now },
});

const VersionSummary = mongoose.models.VersionSummary || mongoose.model<IVersionSummary>('VersionSummary', VersionSummarySchema);
export { VersionSummary };
export default VersionSummary;
