import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Activity from '@/models/Activity';
import { getEventStatus } from '@/lib/eventStatus';

// GET /api/activities - List all active activities
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'Event' or 'Tour' or null for all
        
        const query: any = { active: true };
        if (type && (type === 'Event' || type === 'Tour')) {
            query.type = type;
        }
        
        const activities = await Activity.find(query)
            .sort({ startDate: -1 })
            .lean();
        
        // Add computed status for each activity
        const activitiesWithStatus = activities.map((activity: any) => {
            const status = activity.startDate && activity.endDate 
                ? getEventStatus(activity.startDate, activity.endDate)
                : { ribbonText: null, showLiveTag: false };
            
            return {
                ...activity,
                _id: activity.id.toString(),
                status,
                legCount: activity.activityLegs?.length || 0,
            };
        });
        
        return NextResponse.json(activitiesWithStatus);
    } catch (error: any) {
        console.error('Error fetching activities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activities' },
            { status: 500 }
        );
    }
}
