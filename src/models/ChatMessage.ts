import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    pilot_id: string;
    pilot_name: string;
    pilot_rank: string;
    content: string;
    edited: boolean;
    deleted: boolean;
    created_at: Date;
    updated_at: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
    pilot_id: { type: String, required: true, index: true },
    pilot_name: { type: String, required: true },
    pilot_rank: { type: String, default: 'Cadet' },
    content: { type: String, required: true },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

ChatMessageSchema.index({ created_at: -1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
export default ChatMessage;
