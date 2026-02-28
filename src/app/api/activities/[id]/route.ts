import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Activity from '@/models/Activity';
import ActivityProgress from '@/models/ActivityProgress';
import ActivityInterest from '@/models/ActivityInterest';
import { getEventStatus, formatDateRange } from '@/lib/eventStatus';

// GET /api/activities/[id] - Get single activity with details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        
        const activity = await Activity.findById(id).lean();
        
        if (!activity) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }
        
        // Get interest count for events
        const interestCount = await ActivityInterest.countDocuments({ 
            activity_id: id 
        });
        
        // Get completion stats
        const completedCount = await ActivityProgress.countDocuments({
            activity_id: id,
            percentComplete: 100
        });
        
        // Get all history for leaderboard
        const allProgress = await ActivityProgress.find({ activity_id: id })
            .populate('pilot_id', 'firstName lastName pilotId profileImage')
            .sort({ percentComplete: -1, dateComplete: 1 })
            .lean();
        
        // Compute status
        const status = (activity as any).startDate && (activity as any).endDate
            ? getEventStatus((activity as any).startDate, (activity as any).endDate)
            : { ribbonText: null, showLiveTag: false };
        
        const dateRange = (activity as any).startDate && (activity as any).endDate
            ? formatDateRange((activity as any).startDate, (activity as any).endDate)
            : null;
        
        return NextResponse.json({
            ...(activity as any),
            _id: (activity as any).id.toString(),
            status,
            dateRange,
            interestCount,
            completedCount,
            leaderboard: allProgress.map((p: any) => ({
                ...p,
                _id: p.id.toString(),
                pilot_id: p.pilot_id?.id?.toString(),
                pilot: p.pilot_id,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching activity:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity' },
            { status: 500 }
        );
    }
}
