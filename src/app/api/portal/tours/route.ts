import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';

export async function GET(request: NextRequest) {
    try {
        const session = await verifyAuth(); // Optional: If public, remove this. But we need it for progress check.
        await connectDB();

        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim();
        const difficulty = (searchParams.get('difficulty') || '').trim();
        const status = (searchParams.get('status') || '').trim();
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limitRaw = parseInt(searchParams.get('limit') || '24', 10) || 24;
        const limit = Math.min(60, Math.max(6, limitRaw));
        const skip = (page - 1) * limit;

        const now = new Date();
        const query: any = {
            active: true,
            $and: [
                { $or: [{ start_date: { $exists: false } }, { start_date: null }, { start_date: { $lte: now } }] },
                { $or: [{ end_date: { $exists: false } }, { end_date: null }, { end_date: { $gte: now } }] },
            ],
        };

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
            ];
        }

        if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
            query.difficulty = difficulty;
        }

        const total = await Tour.countDocuments(query);
        const tours = await Tour.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Fetch user progress for all tours if logged in
        let progressMap: Record<string, any> = {};
        if (session) {
            const progressList = await TourProgress.find({ pilot_id: session.id }).lean();
            progressList.forEach((p: any) => {
                progressMap[p.tour_id?.toString?.() || String(p.tour_id)] = p;
            });
        }

        let enrichedTours = tours.map((t: any) => {
            const p = progressMap[t._id.toString()];

            const completedLegs = Array.isArray(p?.completed_legs)
                ? p.completed_legs.length
                : typeof p?.current_leg === 'number'
                    ? p.current_leg
                    : 0;

            const totalLegs = Array.isArray(t?.legs) ? t.legs.length : 0;
            const completed = totalLegs > 0 && completedLegs >= totalLegs;

            return {
                ...t,
                userProgress: {
                    completed,
                    completedLegs,
                    totalLegs,
                },

                // Legacy fields (kept for any older UI pieces)
                user_status: completed ? 'Completed' : p ? 'In Progress' : 'Not Started',
                legs_completed: completedLegs,
            };
        });

        if (status === 'completed') {
            enrichedTours = enrichedTours.filter(t => t.userProgress?.completed);
        } else if (status === 'active') {
            enrichedTours = enrichedTours.filter(t => !t.userProgress?.completed);
        }

        return NextResponse.json({ tours: enrichedTours, total, page, limit });

    } catch (error) {
        console.error('Tours API Error:', error);
        return NextResponse.json({ tours: [], total: 0, page: 1, limit: 24 }, { status: 500 });
    }
}
