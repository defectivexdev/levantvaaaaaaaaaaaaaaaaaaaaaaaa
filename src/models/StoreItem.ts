import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreItem extends Document {
    name: string;
    description?: string;
    price: number;
    category?: string;
    image_url?: string;
    is_active: boolean;
    stock_quantity: number;
    created_at: Date;
}

const StoreItemSchema = new Schema<IStoreItem>({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, index: true },
    category: { type: String, index: true },
    image_url: String,
    is_active: { type: Boolean, default: true, index: true },
    stock_quantity: { type: Number, default: -1 },
    created_at: { type: Date, default: Date.now },
});

const StoreItem = mongoose.models.StoreItem || mongoose.model<IStoreItem>('StoreItem', StoreItemSchema);
export default StoreItem;
