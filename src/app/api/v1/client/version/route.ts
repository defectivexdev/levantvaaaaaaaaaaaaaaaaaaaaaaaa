import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import mongoose from 'mongoose';
import { VersionSummary } from '@/models/VersionSummary';

const API_KEY = 'LEVANT-SECRET-KEY-2026';

export async function GET(req: NextRequest) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (apiKey !== API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database not connected');

        // Find the stable version from settings
        const settings = await db.collection('global_settings').findOne({ key: 'stable_version' });
        const stableVersion = settings?.value || "1.0.0";

        // Find binary details from VersionSummary
        const verSummary = await VersionSummary.findOne({ version: stableVersion });

        return NextResponse.json({
            latestVersion: stableVersion,
            downloadUrl: verSummary?.download_url || "https://github.com/bunnyyxdev/levant-va-main-webbbbbbbbbbbbbbbbbbbbb/releases/latest",
            criticalUpdate: false,
            publishedAt: verSummary?.updatedAt || new Date()
        });
    } catch (error) {
        console.error('Version check error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
