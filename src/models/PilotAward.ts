import mongoose, { Schema, Document } from 'mongoose';

export interface IPilotAward extends Document {
    pilot_id: mongoose.Types.ObjectId;
    award_id: mongoose.Types.ObjectId;
    earned_at: Date;
    seen: boolean;
}

const PilotAwardSchema = new Schema<IPilotAward>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    award_id: { type: Schema.Types.ObjectId, ref: 'Award', required: true, index: true },
    earned_at: { type: Date, default: Date.now },
    seen: { type: Boolean, default: false },
});

PilotAwardSchema.index({ pilot_id: 1, award_id: 1 }, { unique: true });

const PilotAward = mongoose.models.PilotAward || mongoose.model<IPilotAward>('PilotAward', PilotAwardSchema);
export default PilotAward;
