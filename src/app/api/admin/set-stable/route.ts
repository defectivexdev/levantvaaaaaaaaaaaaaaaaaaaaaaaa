import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        const { version } = await req.json();
        if (!version) return NextResponse.json({ error: 'Version is required' }, { status: 400 });

        await connectDB();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        // Update or insert stable version
        await db.collection('global_settings').updateOne(
            { key: 'stable_version' },
            { $set: { value: version, updatedAt: new Date() } },
            { upsert: true }
        );

        // Also update the VersionSummary model if it exists
        try {
            const VersionSummary = mongoose.models.VersionSummary;
            if (VersionSummary) {
                await VersionSummary.updateMany({}, { is_stable: false });
                await VersionSummary.updateOne({ version }, { is_stable: true });
            }
        } catch (e) {
            console.warn('VersionSummary model not found or failed to update:', e);
        }

        return NextResponse.json({ success: true, message: `Stable version set to ${version}` });
    } catch (error: any) {
        console.error('API Error (set-stable):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
