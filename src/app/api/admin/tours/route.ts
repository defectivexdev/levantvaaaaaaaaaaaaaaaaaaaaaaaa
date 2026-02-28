import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';
import Pilot from '@/models/Pilot';

// GET - Fetch all tours for admin
export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const tours = await Tour.find().sort({ created_at: -1 });
        
        // Get participant counts
        const toursWithStats = await Promise.all(tours.map(async (tour) => {
            const participants = await TourProgress.countDocuments({ tour_id: tour.id.toString() });
            const completed = await TourProgress.countDocuments({ tour_id: tour.id.toString(), status: 'Completed' });
            return { ...tour.toObject(), participants, completed };
        }));

        return NextResponse.json({ tours: toursWithStats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new tour
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description, image, banner, awardImage, startDate, endDate, legs } = body;

        if (!name || !description || !legs?.length) {
            return NextResponse.json({ error: 'Name, description, and at least one leg are required' }, { status: 400 });
        }

        // Calculate total distance
        const totalDistance = legs.reduce((sum: number, leg: any) => sum + (leg.distance_nm || 0), 0);

        const tour = await Tour.create({
            name,
            description,
            image: image || undefined,
            banner: banner || undefined,
            award_image: awardImage || undefined,
            start_date: startDate ? new Date(startDate) : undefined,
            end_date: endDate ? new Date(endDate) : undefined,
            legs: legs.map((leg: any, i: number) => ({
                leg_number: i + 1,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                distance_nm: leg.distance_nm || 0,
            })),
            total_distance: totalDistance,
            active: true,
        });

        return NextResponse.json({ success: true, tour });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update tour
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, name, description, image, banner, awardImage, startDate, endDate, legs, active } = body;

        const updateData: any = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (banner !== undefined) updateData.banner = banner;
        if (awardImage !== undefined) updateData.award_image = awardImage;
        if (startDate !== undefined) updateData.start_date = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.end_date = endDate ? new Date(endDate) : null;
        if (active !== undefined) updateData.active = active;
        
        if (legs) {
            updateData.legs = legs.map((leg: any, i: number) => ({
                leg_number: i + 1,
                departure_icao: leg.departure_icao.toUpperCase(),
                arrival_icao: leg.arrival_icao.toUpperCase(),
                distance_nm: leg.distance_nm || 0,
            }));
            // Recalculate total distance
            updateData.total_distance = legs.reduce((sum: number, leg: any) => sum + (leg.distance_nm || 0), 0);
        }

        await Tour.findByIdAndUpdate(id, updateData);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Delete a single leg and auto re-index remaining legs
export async function PATCH(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { tourId, legNumber } = body;

        if (!tourId || legNumber == null) {
            return NextResponse.json({ error: 'tourId and legNumber are required' }, { status: 400 });
        }

        const tour = await Tour.findById(tourId);
        if (!tour) {
            return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
        }

        // Remove the leg
        tour.legs = tour.legs.filter((leg: any) => leg.leg_number !== legNumber);

        // Auto re-index: renumber all remaining legs sequentially 1, 2, 3...
        tour.legs = tour.legs.map((leg: any, i: number) => ({
            ...leg.toObject ? leg.toObject() : leg,
            leg_number: i + 1,
        }));

        await tour.save();

        return NextResponse.json({ success: true, legs: tour.legs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete tour
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        const pilot = await Pilot.findById(session.id);
        if (!pilot?.is_admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        await Tour.findByIdAndDelete(id);
        await TourProgress.deleteMany({ tour_id: id }); // Also delete progress

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
