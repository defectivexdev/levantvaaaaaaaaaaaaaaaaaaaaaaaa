import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffMember extends Document {
    pilot_id: mongoose.Types.ObjectId;
    role_id: mongoose.Types.ObjectId;
    assigned_at: Date;
}

const StaffMemberSchema = new Schema<IStaffMember>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'StaffRole', required: true, index: true },
    assigned_at: { type: Date, default: Date.now },
});

StaffMemberSchema.index({ pilot_id: 1, role_id: 1 }, { unique: true });

const StaffMember = mongoose.models.StaffMember || mongoose.model<IStaffMember>('StaffMember', StaffMemberSchema);
export default StaffMember;
