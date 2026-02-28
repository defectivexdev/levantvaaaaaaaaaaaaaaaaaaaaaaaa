import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import StaffMember from '@/models/StaffMember';
import StaffRole from '@/models/StaffRole';
import Pilot from '@/models/Pilot';

// Ensure models are registered
const _ = { StaffRole, Pilot };

// GET: List all staff members
export async function GET() {
    await dbConnect();
    try {
        const members = await StaffMember.find({})
            .populate('pilot', 'first_name last_name rank pilot_id country')
            .populate('role', 'title order color')
            .sort('-assigned_at'); // Sorting logic can be refined on client-side based on Role Order
            
        return NextResponse.json({ success: true, members });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Assign staff member
export async function POST(req: Request) {
    await dbConnect();
    try {
        const { pilotId, roleId, roleTitle, category, name, callsign, email, picture, discord } = await req.json();
        
        let finalPilotId = pilotId;

        // If pilotId looks like a pilot_id string (e.g. LVT...), find the pilot first
        if (pilotId && pilotId.startsWith('LVT')) {
            const pilot = await Pilot.findOne({ pilot_id: pilotId });
            if (!pilot) {
                return NextResponse.json({ success: false, error: 'Pilot not found with this ID' }, { status: 404 });
            }
            finalPilotId = pilot.id;
        }

        let finalRoleId = roleId;

        // If no roleId, but we have title and category, Find or Create
        if (!finalRoleId && roleTitle && category) {
            let role = await StaffRole.findOne({ title: roleTitle, category });
            if (!role) {
                // Determine a default color based on category
                let color = 'text-white';
                if (category === 'Board of Governor') color = 'text-accent-gold';
                if (category === 'Director') color = 'text-rose-400';
                if (category === 'Chief Pilot') color = 'text-emerald-400';

                role = await StaffRole.create({
                    title: roleTitle,
                    category,
                    color,
                    order: category === 'Board of Governor' ? 1 : (category === 'Director' ? 2 : 3)
                });
            }
            finalRoleId = role.id;
        }

        if (!finalRoleId) {
            return NextResponse.json({ success: false, error: 'Role ID or Title/Category required' }, { status: 400 });
        }
        
        // Check if exists
        const exists = await StaffMember.findOne({ pilot: pilotId, role: finalRoleId });
        if (exists) {
             return NextResponse.json({ success: false, error: 'Pilot already assigned to this role' }, { status: 400 });
        }

        const member = await StaffMember.create({ 
            pilot: finalPilotId, 
            role: finalRoleId,
            name,
            callsign,
            email,
            picture,
            discord
        });
        // Populate for immediate return
        await member.populate(['pilot', 'role']);
        
        return NextResponse.json({ success: true, member });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
