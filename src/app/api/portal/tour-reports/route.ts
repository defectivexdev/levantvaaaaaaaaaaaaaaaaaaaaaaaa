import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import TourReport from '@/models/TourReport';
import Tour from '@/models/Tour';
import Flight from '@/models/Flight';
import { PilotModel } from '@/models';

// GET - Fetch user's tour reports
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const { searchParams } = new URL(request.url);
        const tourId = searchParams.get('tourId');

        const query: any = { pilot_id: session.id };
        if (tourId) query.tour_id = tourId;

        const reports = await TourReport.find(query)
            .sort({ submitted_at: -1 })
            .lean();

        return NextResponse.json({ reports });
    } catch (error: any) {
        console.error('[TourReports GET] Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST - Submit tour completion report
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const pilot = await PilotModel.findById(session.id);
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });

        const body = await request.json();
        const { tourId, legs } = body;

        if (!tourId || !legs?.length) {
            return NextResponse.json({ error: 'Tour ID and legs are required' }, { status: 400 });
        }

        // Fetch tour details
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
        }

        // Check if user already has a pending/approved report for this tour
        const existingReport = await TourReport.findOne({
            pilot_id: session.id,
            tour_id: tourId,
            status: { $in: ['Pending', 'Approved'] }
        });

        if (existingReport) {
            return NextResponse.json({ 
                error: 'You already have a pending or approved report for this tour' 
            }, { status: 400 });
        }

        // Validate legs against actual flights
        const validatedLegs = await Promise.all(legs.map(async (leg: any) => {
            // Find matching flight in pilot's history
            const flight = await Flight.findOne({
                pilot_id: session.id,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                status: { $in: ['Accepted', 'Pending'] }
            }).sort({ created_at: -1 }).lean();

            return {
                leg_number: leg.leg_number,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                flight_id: flight?._id,
                pirep_id: flight?.pirep_id,
                completed: !!flight,
                flight_date: flight?.created_at,
            };
        }));

        const completedCount = validatedLegs.filter(l => l.completed).length;

        const report = await TourReport.create({
            tour_id: tourId,
            pilot_id: session.id,
            pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            tour_name: tour.name,
            legs: validatedLegs,
            status: 'Pending',
            submitted_at: new Date(),
            total_legs: legs.length,
            completed_legs: completedCount,
        });

        console.log(`[TourReport] ${pilot.pilot_id} submitted report for tour ${tour.name} (${completedCount}/${legs.length} legs)`);

        return NextResponse.json({ 
            success: true, 
            report,
            message: `Tour report submitted! ${completedCount}/${legs.length} legs verified.`
        });
    } catch (error: any) {
        console.error('[TourReports POST] Error:', error.message);
        return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }
}

// PUT - Update report (for modifications)
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const body = await request.json();
        const { reportId, legs } = body;

        if (!reportId || !legs?.length) {
            return NextResponse.json({ error: 'Report ID and legs are required' }, { status: 400 });
        }

        // Find report and verify ownership
        const report = await TourReport.findOne({
            _id: reportId,
            pilot_id: session.id,
            status: 'NeedsModification'
        });

        if (!report) {
            return NextResponse.json({ 
                error: 'Report not found or cannot be modified' 
            }, { status: 404 });
        }

        // Re-validate legs
        const validatedLegs = await Promise.all(legs.map(async (leg: any) => {
            const flight = await Flight.findOne({
                pilot_id: session.id,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                approved_status: { $in: [0, 1] }
            }).sort({ submitted_at: -1 }).lean();

            return {
                leg_number: leg.leg_number,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                flight_id: flight?._id,
                pirep_id: (flight as any)?.pirep_id,
                completed: !!flight,
                flight_date: (flight as any)?.submitted_at,
            };
        }));

        const completedCount = validatedLegs.filter(l => l.completed).length;

        report.legs = validatedLegs;
        report.completed_legs = completedCount;
        report.status = 'Pending';
        report.submitted_at = new Date();
        report.modification_notes = undefined;
        await report.save();

        console.log(`[TourReport] Report ${reportId} resubmitted after modifications`);

        return NextResponse.json({ 
            success: true, 
            report,
            message: 'Report updated and resubmitted for review'
        });
    } catch (error: any) {
        console.error('[TourReports PUT] Error:', error.message);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
