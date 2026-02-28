import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffRole extends Document {
    name: string;
    description?: string;
    permissions: string[];
    is_active: boolean;
}

const StaffRoleSchema = new Schema<IStaffRole>({
    name: { type: String, required: true, unique: true, index: true },
    description: String,
    permissions: [String],
    is_active: { type: Boolean, default: true },
});

const StaffRole = mongoose.models.StaffRole || mongoose.model<IStaffRole>('StaffRole', StaffRoleSchema);
export default StaffRole;
