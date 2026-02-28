import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceLog extends Document {
    aircraft_registration: string;
    type: 'REPAIR_FULL' | 'REPAIR_PARTIAL' | 'DAMAGE_FLIGHT' | 'DAMAGE_HARD_LANDING' | 'DAMAGE_OVERSPEED' | 'DAMAGE_GFORCE' | 'SCHEDULED_SERVICE';
    health_before: number;
    health_after: number;
    cost_cr: number;
    description: string;
    flight_id?: mongoose.Types.ObjectId;
    pilot_id?: mongoose.Types.ObjectId;
    performed_by?: string;
    created_at: Date;
}

const MaintenanceLogSchema = new Schema<IMaintenanceLog>({
    aircraft_registration: { type: String, required: true, index: true },
    type: { 
        type: String, 
        enum: ['REPAIR_FULL', 'REPAIR_PARTIAL', 'DAMAGE_FLIGHT', 'DAMAGE_HARD_LANDING', 'DAMAGE_OVERSPEED', 'DAMAGE_GFORCE', 'SCHEDULED_SERVICE'],
        required: true, 
        index: true 
    },
    health_before: { type: Number, required: true },
    health_after: { type: Number, required: true },
    cost_cr: { type: Number, default: 0 },
    description: { type: String, required: true },
    flight_id: { type: Schema.Types.ObjectId, ref: 'Flight' },
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot' },
    performed_by: String,
    created_at: { type: Date, default: Date.now, index: true },
});

const MaintenanceLog = mongoose.models.MaintenanceLog || mongoose.model<IMaintenanceLog>('MaintenanceLog', MaintenanceLogSchema);
export default MaintenanceLog;
