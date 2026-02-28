import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Fleet from '@/models/Fleet';
import AirlineFinance from '@/models/AirlineFinance';
import GlobalConfig from '@/models/GlobalConfig';
import MaintenanceLog from '@/models/MaintenanceLog';
import FinanceLog from '@/models/FinanceLog';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth || !auth.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }
    try {
        await connectDB();

        const { registration, repairType } = await request.json();
        // repairType: 'FULL' | 'MINIMUM' (minimum = repair to grounded_health_threshold + 5%)

        if (!registration) {
            return NextResponse.json({ error: 'Missing aircraft registration' }, { status: 400 });
        }

        const aircraft = await Fleet.findOne({ registration });
        if (!aircraft) {
            return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
        }

        const config = await GlobalConfig.findOne({ key: 'LVT_MAIN' }) || await GlobalConfig.create({ key: 'LVT_MAIN' });
        const airlineFinance = await AirlineFinance.findOne();
        if (!airlineFinance) {
            return NextResponse.json({ error: 'Airline finance record not found' }, { status: 500 });
        }

        const healthBefore = aircraft.condition;
        let targetHealth = 100;

        if (repairType === 'MINIMUM') {
            // Repair just enough to be flyable (threshold + 5%)
            targetHealth = Math.min(100, config.grounded_health_threshold + 5);
            if (aircraft.condition >= targetHealth) {
                return NextResponse.json({ error: 'Aircraft already above minimum flyable condition' }, { status: 400 });
            }
        }

        const healthNeeded = targetHealth - aircraft.condition;
        const repairCost = Math.round(healthNeeded * config.repair_rate_per_percent);

        if (airlineFinance.balance < repairCost) {
            return NextResponse.json({
                error: 'Insufficient Airline Funds (Cr)',
                required: repairCost,
                available: airlineFinance.balance,
                message: 'Not enough credits in the airline fund. Wait for more store purchases or flight revenue.'
            }, { status: 400 });
        }

        // Perform repair
        airlineFinance.balance -= repairCost;
        airlineFinance.total_expenses += repairCost;
        airlineFinance.last_updated = new Date();
        await airlineFinance.save();

        aircraft.condition = targetHealth;
        aircraft.status = 'Available';
        aircraft.grounded_reason = undefined;
        aircraft.last_service = new Date();
        await aircraft.save();

        // Log the repair
        await MaintenanceLog.create({
            aircraft_registration: registration,
            type: repairType === 'MINIMUM' ? 'REPAIR_PARTIAL' : 'REPAIR_FULL',
            health_before: healthBefore,
            health_after: targetHealth,
            cost_cr: repairCost,
            description: `${repairType === 'MINIMUM' ? 'Partial' : 'Full'} repair: ${healthBefore.toFixed(1)}% → ${targetHealth}% (Cost: ${repairCost} Cr)`,
            performed_by: auth.id,
        });

        // Finance transaction log
        await FinanceLog.create({
            pilot_id: auth.id,
            type: 'Maintenance Repair',
            amount: -repairCost,
            description: `Repair ${registration}: ${healthBefore.toFixed(1)}% → ${targetHealth}%`,
            reference_id: registration,
        });

        return NextResponse.json({
            success: true,
            registration,
            healthBefore: parseFloat(healthBefore.toFixed(1)),
            healthAfter: targetHealth,
            repairCost,
            remainingFunds: airlineFinance.balance,
            message: `${registration} repaired to ${targetHealth}%. Cost: ${repairCost} Cr.`
        });

    } catch (error: any) {
        console.error('Maintenance Repair Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// GET: List all aircraft needing maintenance
export async function GET() {
    try {
        await connectDB();

        const config = await GlobalConfig.findOne({ key: 'LVT_MAIN' }) || await GlobalConfig.create({ key: 'LVT_MAIN' });
        const airlineFinance = await AirlineFinance.findOne();

        const aircraft = await Fleet.find({ is_active: true }).sort({ condition: 1 });
        const recentLogs = await MaintenanceLog.find().sort({ created_at: -1 }).limit(20);

        const fleetStatus = aircraft.map(a => ({
            registration: a.registration,
            aircraft_type: a.aircraft_type,
            name: a.name,
            condition: a.condition,
            status: a.status,
            current_location: a.current_location,
            total_hours: a.total_hours,
            flight_count: a.flight_count,
            last_service: a.last_service,
            grounded_reason: a.grounded_reason,
            repairCost: Math.round((100 - a.condition) * config.repair_rate_per_percent),
            isGrounded: a.condition < config.grounded_health_threshold,
        }));

        return NextResponse.json({
            fleet: fleetStatus,
            airlineFunds: airlineFinance?.balance ?? 0,
            repairRatePerPercent: config.repair_rate_per_percent,
            groundedThreshold: config.grounded_health_threshold,
            recentLogs,
        });

    } catch (error: any) {
        console.error('Maintenance Status Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
