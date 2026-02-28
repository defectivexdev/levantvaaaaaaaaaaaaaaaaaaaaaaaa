import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Flight from '@/models/Flight';
import Pilot from '@/models/Pilot';
import { verifyAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { sendPirepReviewEmail } from '@/lib/email';

// GET /api/admin/pireps/[id] - Get single PIREP details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { id } = await params;
        const pirep = await Flight.findById(id).lean();

        if (!pirep) {
            return NextResponse.json({ error: 'PIREP not found' }, { status: 404 });
        }

        return NextResponse.json({ pirep });
    } catch (error: any) {
        console.error('Error fetching PIREP:', error);
        return NextResponse.json({ error: 'Failed to fetch PIREP' }, { status: 500 });
    }
}

// PUT /api/admin/pireps/[id] - Update a PIREP
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { id } = await params;
        const body = await request.json();

        const {
            flight_number,
            departure_icao,
            arrival_icao,
            alternate_icao,
            route,
            aircraft,
            comments,
            admin_comments,
            approved_status
        } = body;

        // A380/A388 fleet restriction — server-side fuzzy block
        // Catches: A380, A388, A-380, Airbus 380, A 380, etc.
        if (approved_status !== undefined && parseInt(approved_status) === 1) {
            const existingPirep = await Flight.findById(id).lean() as any;
            const rawAircraft = aircraft || existingPirep?.aircraft_type || existingPirep?.aircraft || '';
            const normalized = rawAircraft.replace(/[\s\-_]/g, '').toUpperCase();
            if (normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380')) {
                return NextResponse.json(
                    { error: 'Fleet Violation: A380/A388 aircraft is restricted and cannot be approved.' },
                    { status: 400 }
                );
            }
        }

        const updateData: any = {};
        if (flight_number !== undefined) updateData.flight_number = flight_number;
        if (departure_icao !== undefined) updateData.departure_icao = departure_icao.toUpperCase();
        if (arrival_icao !== undefined) updateData.arrival_icao = arrival_icao.toUpperCase();
        if (alternate_icao !== undefined) updateData.alternate_icao = alternate_icao.toUpperCase();
        if (route !== undefined) updateData.route = route.toUpperCase();
        if (aircraft !== undefined) updateData.aircraft = aircraft;
        if (comments !== undefined) updateData.comments = comments;
        if (admin_comments !== undefined) updateData.admin_comments = admin_comments;
        if (approved_status !== undefined) updateData.approved_status = parseInt(approved_status);

        const pirep = await Flight.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).lean() as any;

        if (!pirep) {
            return NextResponse.json({ error: 'PIREP not found' }, { status: 404 });
        }

        // Send notification + email on approval/rejection
        if (approved_status !== undefined && pirep.pilot_id) {
            const status = parseInt(approved_status);
            const route = `${pirep.departure_icao} → ${pirep.arrival_icao}`;
            if (status === 1) {
                // Award credits for approved manual PIREP
                const pilot = await Pilot.findById(pirep.pilot_id);
                if (pilot && pirep.is_manual) {
                    // Calculate base pay: $50 per minute of flight time
                    const flightTimeMinutes = pirep.flight_time || 0;
                    const basePay = flightTimeMinutes * 50;
                    
                    // Update pilot stats
                    pilot.balance = (pilot.balance || 0) + basePay;
                    pilot.total_credits = (pilot.total_credits || 0) + basePay;
                    pilot.total_flights = (pilot.total_flights || 0) + 1;
                    pilot.total_hours = (pilot.total_hours || 0) + (flightTimeMinutes / 60);
                    
                    await pilot.save();
                }
                
                await createNotification({
                    pilotId: pirep.pilot_id,
                    type: 'pirep_approved',
                    title: 'PIREP Approved',
                    message: `Your flight ${pirep.flight_number} (${route}) has been approved.`,
                    link: `/portal/reports/${id}`,
                });
            } else if (status === 2) {
                await createNotification({
                    pilotId: pirep.pilot_id,
                    type: 'pirep_rejected',
                    title: 'PIREP Rejected',
                    message: `Your flight ${pirep.flight_number} (${route}) was rejected.${admin_comments ? ' Reason: ' + admin_comments : ''}`,
                    link: `/portal/reports/${id}`,
                });
            }

            // Send email notification (best-effort)
            if (status === 1 || status === 2) {
                try {
                    const pilot = await Pilot.findOne({ pilot_id: pirep.pilot_id }).lean() as any;
                    if (pilot?.email) {
                        await sendPirepReviewEmail(
                            pilot.email,
                            pilot.first_name || 'Pilot',
                            pirep.flight_number || pirep.callsign,
                            route,
                            status === 1 ? 'approved' : 'rejected',
                            admin_comments || undefined
                        );
                    }
                } catch (emailErr) {
                    console.error('PIREP review email failed (non-fatal):', emailErr);
                }
            }
        }

        return NextResponse.json({ success: true, pirep });
    } catch (error: any) {
        console.error('Error updating PIREP:', error);
        return NextResponse.json({ error: 'Failed to update PIREP' }, { status: 500 });
    }
}

// DELETE /api/admin/pireps/[id] - Delete a PIREP and reverse stats
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();

        const { id } = await params;
        
        // 1. Get Flight to calculate reversals
        const flight = await Flight.findById(id);
        if (!flight) {
            return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
        }

        // 2. Reverse Pilot Stats
        const pilot = await import('@/models/Pilot').then(m => m.default.findById(flight.pilot_id));
        if (pilot) {
            // Calculate strictly what was awarded (Revenue)
            // Note: We subtract from total_credits (XP/Points) and Balance (Cash)
            // Assuming balance was credited 1:1 with revenue as per acars route logic (plus bonuses which we don't fully track perfectly here, but revenue is the big chunk)
            const revenue = (flight.revenue_passenger || 0) + (flight.revenue_cargo || 0);
            
            // Safety check to not go below zero
            const newTotalFlights = Math.max(0, (pilot.total_flights || 1) - 1);
            const newTotalHours = Math.max(0, (pilot.total_hours || 0) - (flight.flight_time / 60));
            const newTotalCredits = Math.max(0, (pilot.total_credits || 0) - revenue);
            const newBalance = Math.max(0, (pilot.balance || 0) - revenue);

            pilot.total_flights = newTotalFlights;
            pilot.total_hours = newTotalHours;
            pilot.total_credits = newTotalCredits;
            pilot.balance = newBalance;
            
            await pilot.save();
        }

        // 3. Delete Finance Logs
        const FinanceLog = await import('@/models/FinanceLog').then(m => m.default);
        await FinanceLog.deleteMany({ reference_id: id });

        // 4. Auto-revoke tour award if this was the final leg
        try {
            const TourProgress = await import('@/models/TourProgress').then(m => m.default);
            const Award = await import('@/models/Award').then(m => m.default);
            const PilotAward = await import('@/models/PilotAward').then(m => m.default);

            // Find any completed tour progress for this pilot where the route matches the last leg
            const completedProgress = await TourProgress.find({
                pilot_id: pilot?._id,
                status: 'Completed',
            }).populate('tour_id');

            for (const progress of completedProgress) {
                const tour = progress.tour_id as any;
                if (!tour?.legs?.length) continue;
                const lastLeg = tour.legs[tour.legs.length - 1];
                if (
                    lastLeg.departure_icao === (flight as any).departure_icao &&
                    lastLeg.arrival_icao === (flight as any).arrival_icao
                ) {
                    // This deleted PIREP was the final leg — revoke the tour award
                    const tourAward = await Award.findOne({ linkedTourId: tour._id, active: true });
                    if (tourAward) {
                        await PilotAward.deleteOne({ pilot_id: pilot?._id, award_id: tourAward._id });
                        console.log(`Auto-revoked award "${tourAward.name}" from pilot ${pilot?.pilot_id} (final leg PIREP deleted)`);
                    }
                    // Revert tour progress back to in-progress
                    progress.status = 'In Progress';
                    progress.completed_at = undefined;
                    progress.current_leg_index = Math.max(0, (progress.current_leg_index || tour.legs.length) - 1);
                    progress.completed_legs.pop();
                    await progress.save();
                }
            }
        } catch (revokeErr) {
            console.error('Auto-revoke award check failed (non-fatal):', revokeErr);
        }

        // 5. Delete Flight Record
        await Flight.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Flight deleted and stats reversed.' });

    } catch (error: any) {
        console.error('Error deleting PIREP:', error);
        return NextResponse.json({ error: 'Failed to delete PIREP' }, { status: 500 });
    }
}
