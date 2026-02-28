import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import { sendInactivityReminderEmail, sendAccountInactiveEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // 1. Mark as Inactive (> X days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - parseInt(process.env.INACTIVITY_INACTIVE_DAYS || ""));

        const inactivePilots = await Pilot.find({
            status: { $in: ['Active', 'On leave (LOA)'] },
            last_activity: { $lt: sixtyDaysAgo }
        });

        for (const pilot of inactivePilots) {
            pilot.status = 'Inactive';
            await pilot.save();
            await sendAccountInactiveEmail(pilot.email, pilot.pilot_id, pilot.first_name);
            console.log(`Pilot ${pilot.pilot_id} marked as Inactive due to 60d inactivity.`);
        }

        // 2. Mark as On leave (LOA) (> X days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - parseInt(process.env.INACTIVITY_LOA_DAYS || ""));

        const loaPilots = await Pilot.find({
            status: 'Active',
            last_activity: { $lt: thirtyDaysAgo, $gt: sixtyDaysAgo }
        });

        for (const pilot of loaPilots) {
            pilot.status = 'On leave (LOA)';
            await pilot.save();
            // Optional: You might want to send a different email for LOA
            console.log(`Pilot ${pilot.pilot_id} marked as On leave (LOA) due to 30d inactivity.`);
        }

        // 3. Send Reminder (> 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const reminderPilots = await Pilot.find({
            status: 'Active',
            last_activity: { $lt: fourteenDaysAgo, $gt: thirtyDaysAgo }
        });

        for (const pilot of reminderPilots) {
            await sendInactivityReminderEmail(pilot.email, pilot.pilot_id, pilot.first_name);
            console.log(`Sent inactivity reminder to pilot ${pilot.pilot_id} (14d+)`);
        }

        return NextResponse.json({
            success: true,
            processed: {
                marked_inactive: inactivePilots.length,
                marked_loa: loaPilots.length,
                reminders_sent: reminderPilots.length
            }
        });

    } catch (error: any) {
        console.error('Inactivity Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
