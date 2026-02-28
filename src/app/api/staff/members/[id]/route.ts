import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import StaffMember from '@/models/StaffMember';
import StaffRole from '@/models/StaffRole';

// PUT: Update staff member
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    try {
        const { roleTitle, category, name, email, picture, discord } = await req.json();

        let finalRoleId;

        // Find or Create Role
        if (roleTitle && category) {
            let role = await StaffRole.findOne({ title: roleTitle, category });
            if (!role) {
                const categoryColorMap: { [key: string]: string } = {
                    'Board of Governor': 'text-accent-gold',
                    'Director': 'text-blue-400',
                    'Chief Pilot': 'text-emerald-400'
                };
                const categoryOrderMap: { [key: string]: number } = {
                    'Board of Governor': 1,
                    'Director': 2,
                    'Chief Pilot': 3
                };

                role = await StaffRole.create({
                    title: roleTitle,
                    category,
                    color: categoryColorMap[category] || 'text-gray-400',
                    order: categoryOrderMap[category] || 99
                });
            }
            finalRoleId = role.id;
        }

        const member = await StaffMember.findByIdAndUpdate(id, {
            role: finalRoleId,
            name,
            email,
            picture,
            discord
        }, { new: true }).populate('pilot').populate('role');

        return NextResponse.json({ success: true, member });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Remove staff member
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    try {
        await StaffMember.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
