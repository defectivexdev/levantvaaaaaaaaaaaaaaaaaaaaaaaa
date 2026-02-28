import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import ActivityProgress from '@/models/ActivityProgress';
import Activity from '@/models/Activity';
import { verifyAuth } from '@/lib/auth';

// GET /api/activities/[id]/progress - Get pilot's progress on activity
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        // Get pilot from token
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        const progress = await ActivityProgress.findOne({
            activity_id: id,
            pilot_id: session.id
        }).lean();
        
        if (!progress) {
            return NextResponse.json({
                started: false,
                legsComplete: 0,
                percentComplete: 0,
                completedLegIds: []
            });
        }
        
        return NextResponse.json({
            started: true,
            ...(progress as any),
            _id: (progress as any).id.toString(),
        });
    } catch (error: any) {
        console.error('Error fetching progress:', error);
        return NextResponse.json(
            { error: 'Failed to fetch progress' },
            { status: 500 }
        );
    }
}

// POST /api/activities/[id]/progress - Update pilot's progress (complete a leg)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const session = await verifyAuth();
        if (!session) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        const { legId } = await request.json();
        
        // Get activity to calculate percentage
        const activity = await Activity.findById(id);
        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }
        
        const totalLegs = activity.activityLegs.length;
        
        // Upsert progress
        let progress = await ActivityProgress.findOne({
            activity_id: id,
            pilot_id: session.id
        });
        
        if (!progress) {
            progress = new ActivityProgress({
                activity_id: id,
                pilot_id: session.id,
                completedLegIds: [],
            });
        }
        
        // Add leg if not already completed
        if (!progress.completedLegIds.includes(legId)) {
            progress.completedLegIds.push(legId);
            progress.legsComplete = progress.completedLegIds.length;
            progress.percentComplete = Math.round((progress.legsComplete / totalLegs) * 100);
            progress.lastLegFlownDate = new Date();
            
            // Check if completed
            if (progress.percentComplete >= 100) {
                progress.dateComplete = new Date();
                progress.daysToComplete = Math.ceil(
                    (progress.dateComplete.getTime() - progress.startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                
                // Update activity stats
                await Activity.findByIdAndUpdate(id, {
                    $inc: { totalPilotsComplete: 1 }
                });
            }
            
            await progress.save();
        }
        
        return NextResponse.json({
            success: true,
            legsComplete: progress.legsComplete,
            percentComplete: progress.percentComplete,
            isComplete: progress.percentComplete >= 100
        });
    } catch (error: any) {
        console.error('Error updating progress:', error);
        return NextResponse.json(
            { error: 'Failed to update progress' },
            { status: 500 }
        );
    }
}
