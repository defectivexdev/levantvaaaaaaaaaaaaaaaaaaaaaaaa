import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import { sendAccountActivatedEmail, sendAccountInactiveEmail, sendProfileEditedEmail, sendPasswordResetEmail } from '@/lib/email';
import { checkAndUpgradeRank } from '@/lib/ranks';
import { v4 as uuidv4 } from 'uuid';
import PasswordReset from '@/models/PasswordReset';

// GET - List all users with roles and status
export async function GET() {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = await PilotModel.find({ email: { $ne: 'admin@levant-va.com' } })
            .sort({ created_at: -1 })
            .select('-password');
        
        const formattedUsers = users.map(user => ({
            id: user.id.toString(),
            pilotId: user.pilot_id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            status: user.status,
            rank: user.rank,
            country: user.country,
            city: user.city,
            timezone: user.timezone,
            currentLocation: user.current_location,
            totalHours: user.total_hours || 0,
            transferHours: user.transfer_hours || 0,
            totalFlights: user.total_flights || 0,
            totalCredits: user.total_credits || 0,
            balance: user.balance || 0,
            createdAt: user.created_at,
            lastActivity: user.last_activity,
            homeBase: user.home_base,
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (error: any) {
        console.error('Admin users GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update a user (all fields except password)
export async function PUT(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { userId, ...updates } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Fetch user for email notifications
        const user = await PilotModel.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const previousStatus = user.status;
        const updateData: Record<string, any> = {};
        const changes: string[] = [];
        
        // Map camelCase to snake_case for database
        const fieldMapping: Record<string, string> = {
            pilotId: 'pilot_id',
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            role: 'role',
            status: 'status',
            rank: 'rank',
            country: 'country',
            city: 'city',
            timezone: 'timezone',
            currentLocation: 'current_location',
            totalHours: 'total_hours',
            transferHours: 'transfer_hours',
            totalFlights: 'total_flights',
            totalCredits: 'total_credits',
            balance: 'balance',
            homeBase: 'home_base',
        };

        // Build update object (exclude password) and track changes
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'password') continue; // Never allow password update via this endpoint
            const dbField = fieldMapping[key];
            if (dbField && value !== undefined) {
                const oldValue = (user as any)[dbField];
                if (oldValue !== value) {
                    updateData[dbField] = value;
                    changes.push(`${key}: ${oldValue} → ${value}`);
                }
            }
        }

        // Special handling for role
        if (updates.role) {
            updateData.is_admin = updates.role === 'Admin';
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        await PilotModel.findByIdAndUpdate(userId, updateData);

        // Send email notifications based on status change
        if (updates.status && updates.status !== previousStatus) {
            if (updates.status === 'Active' && (previousStatus === 'Pending' || previousStatus === 'Inactive')) {
                // Account activated
                await sendAccountActivatedEmail(user.email, user.pilot_id, user.first_name);
            } else if (updates.status === 'Inactive') {
                // Account marked inactive
                await sendAccountInactiveEmail(user.email, user.pilot_id, user.first_name);
            }
        }

        // Auto-check for rank promotion if hours/flights changed
        if (updates.totalHours || updates.transferHours || updates.totalFlights) {
            await checkAndUpgradeRank(userId);
        }

        // Send profile edit notification if there were changes
        if (changes.length > 0) {
            await sendProfileEditedEmail(user.email, user.pilot_id, user.first_name, changes);
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Admin users PUT error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a user account
export async function DELETE(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await PilotModel.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent deleting admin account
        if (user.email === 'admin@levant-va.com') {
            return NextResponse.json({ error: 'Cannot delete admin account' }, { status: 403 });
        }

        await PilotModel.findByIdAndDelete(userId);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Admin users DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Admin actions (reset password)
export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await connectDB();
        
        if (!session.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { action, userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await PilotModel.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (action === 'resetPassword') {
            // Generate reset token
            const token = uuidv4();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Delete any existing tokens for this email
            await PasswordReset.deleteMany({ email: user.email });

            // Create new reset token
            await PasswordReset.create({
                email: user.email,
                token,
                expires_at: expiresAt,
            });

            // Send password reset email
            try {
                await sendPasswordResetEmail(user.email, token);
            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError);
            }

            return NextResponse.json({ 
                success: true, 
                message: 'Password reset email sent to user'
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin users POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
