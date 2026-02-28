import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingAuth extends Document {
    code: string;
    type: 'device' | 'oauth';
    status: 'pending' | 'authorized';
    pilot_data?: Record<string, any>;
    session_token?: string;
    // OAuth PKCE fields
    pilot_id?: string;
    code_challenge?: string;
    challenge_method?: string;
    redirect_uri?: string;
    expires_at: Date;
    created_at: Date;
}

const PendingAuthSchema = new Schema<IPendingAuth>({
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['device', 'oauth'], required: true },
    status: { type: String, enum: ['pending', 'authorized'], default: 'pending' },
    pilot_data: { type: Schema.Types.Mixed },
    session_token: { type: String },
    pilot_id: { type: String },
    code_challenge: { type: String },
    challenge_method: { type: String },
    redirect_uri: { type: String },
    expires_at: { type: Date, required: true },
    created_at: { type: Date, default: Date.now },
});

// TTL index: MongoDB automatically deletes expired documents
PendingAuthSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const PendingAuth = mongoose.models.PendingAuth || mongoose.model<IPendingAuth>('PendingAuth', PendingAuthSchema);
export default PendingAuth;
