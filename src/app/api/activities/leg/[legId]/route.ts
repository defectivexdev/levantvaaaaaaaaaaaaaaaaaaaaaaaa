import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import Activity from '@/models/Activity';
import ActivityProgress from '@/models/ActivityProgress';
import { verifyAuth } from '@/lib/auth';

// GET /api/activities/leg/[legId] - Get single activity leg with booking status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ legId: string }> }
) {
    try {
        await dbConnect();
        const { legId } = await params;
        
        // Find activity containing this leg
        const activity = await Activity.findOne({
            'activityLegs.id': legId
        }).lean();
        
        if (!activity) {
            return NextResponse.json(
                { error: 'Leg not found' },
                { status: 404 }
            );
        }
        
        // Find the specific leg
        const leg = (activity as any).activityLegs.find(
            (l: any) => l.id.toString() === legId
        );
        
        if (!leg) {
            return NextResponse.json(
                { error: 'Leg not found' },
                { status: 404 }
            );
        }
        
        // Check if user is authenticated and get booking status
        let canBook = false;
        let hasActiveBid = false;
        let isLegComplete = false;
        
        try {
            const session = await verifyAuth();
            if (session) {
                // Check progress
                const progress = await ActivityProgress.findOne({
                    activity_id: (activity as any).id,
                    pilot_id: session.id
                });
                
                // Check if this leg is already completed
                isLegComplete = progress?.completedLegIds?.some(
                    (id: any) => id.toString() === legId
                ) || false;
                
                // Can book if activity is active and (no order required OR this is the next leg)
                if ((activity as any).active && !isLegComplete) {
                    if (!(activity as any).legsInOrder) {
                        canBook = true;
                    } else {
                        // Must be the next sequential leg
                        const completedCount = progress?.legsComplete || 0;
                        if (leg.leg_number === completedCount + 1) {
                            canBook = true;
                        }
                    }
                }
                
                // TODO: Check for active bid in Bid collection
                // hasActiveBid = await Bid.exists({ pilot_id: session.id, status: 'active' });
            }
        } catch {
            // Not authenticated - that's ok for viewing
        }
        
        return NextResponse.json({
            leg: {
                ...leg,
                _id: leg.id.toString(),
            },
            activity: {
                _id: (activity as any).id.toString(),
                title: (activity as any).title,
                type: (activity as any).type,
                legsInOrder: (activity as any).legsInOrder,
                active: (activity as any).active,
            },
            bookingStatus: {
                canBook,
                hasActiveBid,
                isLegComplete,
            }
        });
    } catch (error: any) {
        console.error('Error fetching leg:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leg' },
            { status: 500 }
        );
    }
}
