import mongoose, { Schema, Document } from 'mongoose';

export interface IAirport extends Document {
    icao: string;
    iata?: string;
    name: string;
    city?: string;
    country?: string;
    latitude: number;
    longitude: number;
    elevation?: number;
}

const AirportSchema = new Schema<IAirport>({
    icao: { type: String, required: true, unique: true, index: true },
    iata: String,
    name: { type: String, required: true },
    city: String,
    country: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    elevation: Number,
});

const Airport = mongoose.models.Airport || mongoose.model<IAirport>('Airport', AirportSchema);
export default Airport;
