import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
    pilot_id: mongoose.Types.ObjectId;
    item_id: mongoose.Types.ObjectId;
    price: number;
    purchased_at: Date;
}

const PurchaseSchema = new Schema<IPurchase>({
    pilot_id: { type: Schema.Types.ObjectId, ref: 'Pilot', required: true, index: true },
    item_id: { type: Schema.Types.ObjectId, ref: 'StoreItem', required: true, index: true },
    price: { type: Number, required: true },
    purchased_at: { type: Date, default: Date.now },
});

const Purchase = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
export default Purchase;
