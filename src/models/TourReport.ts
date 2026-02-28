import mongoose, { Schema, Document } from 'mongoose';

export interface ITourReportLeg {
    leg_number: number;
    departure_icao: string;
    arrival_icao: string;
    flight_id?: mongoose.Types.ObjectId;
    pirep_id?: string;
    completed: boolean;
    flight_date?: Date;
}

export interface ITourReport extends Document {
    tour_id: mongoose.Types.ObjectId;
    pilot_id: mongoose.Types.ObjectId;
    pilot_name: string;
    tour_name: string;
    legs: ITourReportLeg[];
    status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsModification';
    submitted_at: Date;
    reviewed_at?: Date;
    reviewed_by?: mongoose.Types.ObjectId;
    reviewer_name?: string;
    admin_notes?: string;
    modification_notes?: string;
    total_legs: number;
    completed_legs: number;
}

const TourReportLegSchema = new Schema({
    leg_number: { type: Number, required: true },
    departure_icao: { type: String, required: true },
    arrival_icao: { type: String, required: true },
    flight_id: { type: Schema.Types.ObjectId, ref: 'Flight' },
    pirep_id: String,
    completed: { type: Boolean, default: false },
    flight_date: Date,
}, { _id: false });

const TourReportSchema = new Schema<ITourReport>({
    tour_id: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    pilot_name: { type: String, required: true },
    tour_name: { type: String, required: true },
    legs: { type: [TourReportLegSchema], default: [] },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'NeedsModification'], 
        default: 'Pending',
        index: true 
    },
    submitted_at: { type: Date, default: Date.now, index: true },
    reviewed_at: Date,
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'Pilot' },
    reviewer_name: String,
    admin_notes: String,
    modification_notes: String,
    total_legs: { type: Number, required: true },
    completed_legs: { type: Number, default: 0 },
});

const TourReport = mongoose.models.TourReport || mongoose.model<ITourReport>('TourReport', TourReportSchema);
export default TourReport;
