import mongoose from 'mongoose';

declare global {
    var mongooseConnection: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    } | undefined;
}

let cached = global.mongooseConnection;

if (!cached) {
    cached = global.mongooseConnection = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
    if (cached!.conn) {
        return cached!.conn;
    }

    const MONGODB_URI = process.env.MONGODB_URI || '';
    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable');
    }

    if (!cached!.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            heartbeatFrequencyMS: 10000,
            autoIndex: process.env.NODE_ENV !== 'production',
        };

        const scheme = MONGODB_URI.startsWith('mongodb+srv') ? 'SRV' : 'Standard';
        const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
        console.log(`[MongoDB] Connecting (${scheme}): ${maskedUri.substring(0, 80)}...`);

        cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('[MongoDB] Connected successfully');
            return mongoose;
        });
    }

    try {
        cached!.conn = await cached!.promise;
    } catch (e: any) {
        cached!.promise = null;
        const msg = e.message || '';
        if (msg.includes('querySrv') || msg.includes('ECONNREFUSED')) {
            console.error('[MongoDB] SRV DNS resolution failed. Your network may block SRV queries.');
            console.error('[MongoDB] Fix: Use a non-SRV URI (mongodb://host1,host2,host3/db) or change DNS to 1.1.1.1 / 8.8.8.8');
        } else if (msg.includes('authentication failed') || msg.includes('AuthenticationFailed')) {
            console.error('[MongoDB] Authentication failed. Check username/password in MONGODB_URI.');
        } else if (msg.includes('not allowed') || msg.includes('whitelist')) {
            console.error('[MongoDB] IP not whitelisted. Add your IP in Atlas → Network Access.');
        } else {
            console.error('[MongoDB] Connection error:', msg);
        }
        throw e;
    }

    return cached!.conn;
}

export default connectDB;
