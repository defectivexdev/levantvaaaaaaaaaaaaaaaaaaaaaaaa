import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import GlobalConfig from '@/models/GlobalConfig';
import { verifyAuth } from '@/lib/auth';

// GET: Fetch current config
export async function GET() {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    try {
        await connectDB();

        let config = await GlobalConfig.findOne({ key: 'LVT_MAIN' });
        if (!config) {
            config = await GlobalConfig.create({ key: 'LVT_MAIN' });
        }

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        console.error('Config GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update config
export async function PUT(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    try {
        await connectDB();

        const updates = await request.json();

        // Whitelist allowed fields
        const allowedFields = [
            'fuel_tax_percent', 'penalty_multiplier', 'repair_rate_per_percent',
            'ticket_price_per_nm', 'cargo_price_per_lb_nm', 'fuel_price_per_lb',
            'base_landing_fee', 'pilot_pay_rate',
            'hard_landing_threshold', 'severe_damage_threshold',
            'overspeed_damage_per_10s', 'gforce_high_threshold', 'gforce_low_threshold',
            'grounded_health_threshold', 'store_to_airline_percent'
        ];

        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined && typeof updates[key] === 'number') {
                sanitized[key] = updates[key];
            }
        }

        sanitized.updated_at = new Date();
        sanitized.updated_by = auth.id;

        const config = await GlobalConfig.findOneAndUpdate(
            { key: 'LVT_MAIN' },
            { $set: sanitized },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        console.error('Config PUT Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
