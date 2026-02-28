import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        // Fetch logs
        const logs = await db.collection('deploy_logs')
            .find({})
            .sort({ deployedAt: -1 })
            .limit(10)
            .toArray();

        // Fetch stable version
        const settings = await db.collection('global_settings').findOne({ key: 'stable_version' });

        return NextResponse.json({ 
            success: true, 
            logs,
            stableVersion: settings?.value || '1.0.0'
        });
    } catch (error: any) {
        console.error('API Error (deploy-logs):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
