import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import TourReport from '@/models/TourReport';
import Flight from '@/models/Flight';
import { PilotModel } from '@/models';
import TourProgress from '@/models/TourProgress';
import Tour from '@/models/Tour';

// GET - Fetch all tour reports for admin review
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const pilot = await PilotModel.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const query: any = {};
        if (status) query.status = status;

        const reports = await TourReport.find(query)
            .sort({ submitted_at: -1 })
            .lean();

        return NextResponse.json({ reports });
    } catch (error: any) {
        console.error('[Admin TourReports GET] Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST - Validate/Approve/Reject tour report
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const admin = await PilotModel.findById(session.id);
        if (!admin?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { reportId, action, adminNotes, modificationNotes } = body;

        if (!reportId || !action) {
            return NextResponse.json({ error: 'Report ID and action are required' }, { status: 400 });
        }

        const report = await TourReport.findById(reportId);
        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const adminName = `${admin.first_name} ${admin.last_name}`;

        switch (action) {
            case 'approve':
                // Verify all legs have matching flights
                const allLegsValid = report.legs.every((leg: any) => leg.completed && leg.flight_id);
                
                if (!allLegsValid) {
                    return NextResponse.json({ 
                        error: 'Cannot approve: Not all legs have verified flights' 
                    }, { status: 400 });
                }

                report.status = 'Approved';
                report.reviewed_at = new Date();
                report.reviewed_by = session.id;
                report.reviewer_name = adminName;
                report.admin_notes = adminNotes;
                await report.save();

                // Update or create TourProgress
                const tour = await Tour.findById(report.tour_id);
                if (tour) {
                    await TourProgress.findOneAndUpdate(
                        { tour_id: report.tour_id, pilot_id: report.pilot_id },
                        {
                            tour_id: report.tour_id,
                            pilot_id: report.pilot_id,
                            status: 'Completed',
                            completed_legs: report.legs.map((leg: any) => ({
                                leg_number: leg.leg_number,
                                departure_icao: leg.departure_icao,
                                arrival_icao: leg.arrival_icao,
                                completed_at: leg.flight_date || new Date(),
                            })),
                            completed_at: new Date(),
                        },
                        { upsert: true, new: true }
                    );

                    // Award credits to pilot
                    if (tour.reward_credits > 0) {
                        await PilotModel.findByIdAndUpdate(report.pilot_id, {
                            $inc: { credits: tour.reward_credits }
                        });
                    }
                }

                console.log(`[Admin] ${adminName} approved tour report ${reportId} for ${report.pilot_name}`);
                break;

            case 'modify':
                if (!modificationNotes) {
                    return NextResponse.json({ 
                        error: 'Modification notes are required' 
                    }, { status: 400 });
                }

                report.status = 'NeedsModification';
                report.reviewed_at = new Date();
                report.reviewed_by = session.id;
                report.reviewer_name = adminName;
                report.admin_notes = adminNotes;
                report.modification_notes = modificationNotes;
                await report.save();

                console.log(`[Admin] ${adminName} requested modifications for report ${reportId}`);
                break;

            case 'reject':
                if (!adminNotes) {
                    return NextResponse.json({ 
                        error: 'Admin notes are required for rejection' 
                    }, { status: 400 });
                }

                report.status = 'Rejected';
                report.reviewed_at = new Date();
                report.reviewed_by = session.id;
                report.reviewer_name = adminName;
                report.admin_notes = adminNotes;
                await report.save();

                console.log(`[Admin] ${adminName} rejected tour report ${reportId}`);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            report,
            message: `Report ${action}d successfully`
        });
    } catch (error: any) {
        console.error('[Admin TourReports POST] Error:', error.message);
        return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
    }
}

// GET flight details for verification
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        
        const admin = await PilotModel.findById(session.id);
        if (!admin?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { pilotId, departureIcao, arrivalIcao } = body;

        if (!pilotId || !departureIcao || !arrivalIcao) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch all matching flights for this pilot
        const flights = await Flight.find({
            pilot_id: pilotId,
            departure_icao: departureIcao.toUpperCase(),
            arrival_icao: arrivalIcao.toUpperCase(),
        }).sort({ submitted_at: -1 }).limit(10).lean();

        return NextResponse.json({ flights });
    } catch (error: any) {
        console.error('[Admin TourReports PUT] Error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch flights' }, { status: 500 });
    }
}
