import mongoose, { Schema, Document } from 'mongoose';

export interface IAirlineFinance extends Document {
    balance: number;
    total_revenue: number;
    total_expenses: number;
    last_updated: Date;
}

const AirlineFinanceSchema = new Schema<IAirlineFinance>({
    balance: { type: Number, default: 1000000 },
    total_revenue: { type: Number, default: 0 },
    total_expenses: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
});

const AirlineFinance = mongoose.models.AirlineFinance || mongoose.model<IAirlineFinance>('AirlineFinance', AirlineFinanceSchema);
export default AirlineFinance;
