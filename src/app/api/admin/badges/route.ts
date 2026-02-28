import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/database';
import PilotAward from '@/models/PilotAward';
import Award from '@/models/Award';
import Pilot from '@/models/Pilot';
import Tour from '@/models/Tour';
import { verifyAuth } from '@/lib/auth';

// GET /api/admin/badges - List all awards + assignments + pilots + tours
export async function GET(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();
        
        const [awards, pilotAwards, pilots, tours] = await Promise.all([
            Award.find({}).populate('linkedTourId', 'name').sort({ order: 1, name: 1 }).lean(),
            PilotAward.find({}).populate('award_id').populate('pilot_id', 'pilot_id first_name last_name').lean(),
            Pilot.find({}).select('_id pilot_id first_name last_name').sort({ pilot_id: 1 }).lean(),
            Tour.find({ is_active: true }).select('_id name').sort({ name: 1 }).lean(),
        ]);
        
        return NextResponse.json({ awards, pilotAwards, pilots, tours });
    } catch (error: any) {
        console.error('Error fetching admin awards:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

// POST /api/admin/badges - Create award OR assign award to pilot
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();
        const body = await request.json();

        // ── Assign existing award to pilot ──
        if (body.action === 'assign') {
            const { pilotId, awardId } = body;
            if (!pilotId || !awardId) {
                return NextResponse.json({ error: 'Missing pilotId or awardId' }, { status: 400 });
            }
            const existing = await PilotAward.findOne({ pilot_id: pilotId, award_id: awardId });
            if (existing) {
                return NextResponse.json({ error: 'Pilot already has this award' }, { status: 400 });
            }
            const pa = await PilotAward.create({ pilot_id: pilotId, award_id: awardId, earned_at: new Date() });
            return NextResponse.json({ success: true, pilotAward: pa });
        }

        // ── Manual grant by VID ──
        if (body.action === 'grantByVid') {
            const { vid, awardId } = body;
            if (!vid || !awardId) {
                return NextResponse.json({ error: 'Missing VID or awardId' }, { status: 400 });
            }
            const pilot = await Pilot.findOne({ pilot_id: vid });
            if (!pilot) {
                return NextResponse.json({ error: `Pilot ${vid} not found` }, { status: 404 });
            }
            const existing = await PilotAward.findOne({ pilot_id: pilot._id, award_id: awardId });
            if (existing) {
                return NextResponse.json({ error: 'Pilot already has this award' }, { status: 400 });
            }
            const pa = await PilotAward.create({ pilot_id: pilot._id, award_id: awardId, earned_at: new Date() });
            return NextResponse.json({ success: true, pilotAward: pa, pilotName: `${pilot.first_name} ${pilot.last_name}` });
        }

        // ── Create new award ──
        const { name, description, category, linkedTourId, imageBase64 } = body;
        if (!name) {
            return NextResponse.json({ error: 'Award name is required' }, { status: 400 });
        }

        let imageUrl = '';
        if (imageBase64) {
            // Save base64 image to /public/img/awards/
            const match = imageBase64.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/);
            if (match) {
                const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                const buffer = Buffer.from(match[2], 'base64');
                const filename = `award_${Date.now()}.${ext}`;
                const dir = path.join(process.cwd(), 'public', 'img', 'awards');
                await mkdir(dir, { recursive: true });
                await writeFile(path.join(dir, filename), buffer);
                imageUrl = `/img/awards/${filename}`;
            }
        }

        const award = await Award.create({
            name,
            description: description || '',
            category: category || 'Special',
            linkedTourId: linkedTourId || null,
            imageUrl,
            active: true,
        });

        return NextResponse.json({ success: true, award });
    } catch (error: any) {
        console.error('Error in POST /api/admin/badges:', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}

// PUT /api/admin/badges - Update an award
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();
        const body = await request.json();
        const { id, name, description, category, linkedTourId, imageBase64, active } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing award ID' }, { status: 400 });
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;
        if (linkedTourId !== undefined) updates.linkedTourId = linkedTourId || null;
        if (active !== undefined) updates.active = active;

        // Handle new image upload
        if (imageBase64) {
            const match = imageBase64.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/);
            if (match) {
                const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                const buffer = Buffer.from(match[2], 'base64');
                const filename = `award_${Date.now()}.${ext}`;
                const dir = path.join(process.cwd(), 'public', 'img', 'awards');
                await mkdir(dir, { recursive: true });
                await writeFile(path.join(dir, filename), buffer);
                updates.imageUrl = `/img/awards/${filename}`;
            }
        }

        const award = await Award.findByIdAndUpdate(id, updates, { new: true });
        return NextResponse.json({ success: true, award });
    } catch (error: any) {
        console.error('Error updating award:', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}

// DELETE /api/admin/badges - Remove award assignment OR delete award definition
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const assignmentId = searchParams.get('assignmentId');
        const awardId = searchParams.get('awardId');

        if (assignmentId) {
            // Remove a single pilot-award assignment
            await PilotAward.findByIdAndDelete(assignmentId);
            return NextResponse.json({ success: true });
        }

        if (awardId) {
            // Delete the award definition + all assignments
            await PilotAward.deleteMany({ award_id: awardId });
            await Award.findByIdAndDelete(awardId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing assignmentId or awardId' }, { status: 400 });
    } catch (error: any) {
        console.error('Error deleting:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
