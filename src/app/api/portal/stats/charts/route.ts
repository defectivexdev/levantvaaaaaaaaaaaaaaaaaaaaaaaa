import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Flight from '@/models/Flight';
import mongoose from 'mongoose';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const pilotObjId = new mongoose.Types.ObjectId(session.id);

    // Last 12 months range
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 1. Flight hours per month (last 12 months)
    const hoursPerMonth = await Flight.aggregate([
        {
            $match: {
                pilot_id: pilotObjId,
                approved_status: 1,
                submitted_at: { $gte: twelveMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$submitted_at' },
                    month: { $month: '$submitted_at' }
                },
                totalMinutes: { $sum: '$flight_time' },
                flights: { $sum: 1 },
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Fill in missing months
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const flightHoursData = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const entry = hoursPerMonth.find(
            (h: any) => h._id.year === d.getFullYear() && h._id.month === d.getMonth() + 1
        );
        flightHoursData.push({
            month: `${monthLabels[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
            hours: entry ? parseFloat((entry.totalMinutes / 60).toFixed(1)) : 0,
            flights: entry ? entry.flights : 0,
        });
    }

    // 2. Landing rate distribution (last 50 flights)
    const recentFlights = await Flight.find({
        pilot_id: pilotObjId,
        approved_status: 1,
    })
        .sort({ submitted_at: -1 })
        .limit(50)
        .select('landing_rate submitted_at flight_number')
        .lean();

    const landingRateData = recentFlights.reverse().map((f: any) => ({
        flight: f.flight_number,
        rate: Math.abs(f.landing_rate),
        date: f.submitted_at,
    }));

    // 3. Landing rate buckets for distribution chart
    const buckets = [
        { label: '0-100', min: 0, max: 100, count: 0 },
        { label: '100-200', min: 100, max: 200, count: 0 },
        { label: '200-400', min: 200, max: 400, count: 0 },
        { label: '400-600', min: 400, max: 600, count: 0 },
        { label: '600+', min: 600, max: Infinity, count: 0 },
    ];
    recentFlights.forEach((f: any) => {
        const absRate = Math.abs(f.landing_rate);
        const bucket = buckets.find(b => absRate >= b.min && absRate < b.max);
        if (bucket) bucket.count++;
    });
    const landingDistribution = buckets.map(b => ({
        range: b.label,
        count: b.count,
        color: b.min < 200 ? '#22c55e' : b.min < 400 ? '#eab308' : '#ef4444',
    }));

    // 4. Fuel efficiency (fuel per hour over last 20 flights)
    const fuelFlights = await Flight.find({
        pilot_id: pilotObjId,
        approved_status: 1,
        fuel_used: { $gt: 0 },
        flight_time: { $gt: 0 },
    })
        .sort({ submitted_at: -1 })
        .limit(20)
        .select('fuel_used flight_time flight_number submitted_at')
        .lean();

    const fuelData = fuelFlights.reverse().map((f: any) => ({
        flight: f.flight_number,
        fuelPerHour: parseFloat(((f.fuel_used / (f.flight_time / 60)) || 0).toFixed(0)),
    }));

    return NextResponse.json({
        flightHours: flightHoursData,
        landingRates: landingRateData,
        landingDistribution,
        fuelEfficiency: fuelData,
    });
}
