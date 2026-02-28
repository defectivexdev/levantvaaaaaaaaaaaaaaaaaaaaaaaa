import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';

// GET - Tour Details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; 
        const session = await verifyAuth();
        await connectDB();
        
        const tour = await Tour.findById(id);
        if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });

        const now = new Date();
        if (!tour.active) {
            return NextResponse.json({ error: 'Tour unavailable' }, { status: 404 });
        }
        if (tour.start_date && new Date(tour.start_date) > now) {
            return NextResponse.json({ error: 'Tour not started yet' }, { status: 403 });
        }
        if (tour.end_date && new Date(tour.end_date) < now) {
            return NextResponse.json({ error: 'Tour has ended' }, { status: 403 });
        }

        let progress = null;
        if (session) {
            progress = await TourProgress.findOne({ pilot_id: session.id, tour_id: id });
        }

        return NextResponse.json({ 
            tour, 
            progress: progress ? {
                currentLeg: progress.current_leg_index,
                completedLegs: progress.completed_legs,
                status: progress.status
            } : null 
        });

    } catch (error) {
        console.error('Tour Detail API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Join Tour
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await verifyAuth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();

        // Verify Tour Exists
        const tour = await Tour.findById(id);
        if (!tour || !tour.active) {
            return NextResponse.json({ error: 'Tour unavailable' }, { status: 404 });
        }

        const now = new Date();
        if (tour.start_date && new Date(tour.start_date) > now) {
            return NextResponse.json({ error: 'Tour not started yet' }, { status: 403 });
        }
        if (tour.end_date && new Date(tour.end_date) < now) {
            return NextResponse.json({ error: 'Tour has ended' }, { status: 403 });
        }

        // Check if already joined
        const existing = await TourProgress.findOne({ pilot_id: session.id, tour_id: id });
        if (existing) {
             return NextResponse.json({ success: true, message: 'Already joined', progress: existing });
        }

        // Create Progress
        const progress = await TourProgress.create({
            pilot_id: session.id,
            tour_id: id,
            current_leg_index: 0,
            completed_legs: [],
            status: 'In Progress'
        });

        return NextResponse.json({ success: true, progress });

    } catch (error) {
        console.error('Join Tour API Error:', error);
        return NextResponse.json({ error: 'Failed to join tour' }, { status: 500 });
    }
}
