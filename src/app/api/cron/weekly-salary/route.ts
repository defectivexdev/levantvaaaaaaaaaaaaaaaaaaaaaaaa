import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { PilotModel } from '@/models';
import GlobalConfig from '@/models/GlobalConfig';
import FinanceLog from '@/models/FinanceLog';
import { sendDiscordNotification } from '@/lib/discord';

// Map rank name to salary config key
function getSalaryKey(rank: string): string {
    const map: Record<string, string> = {
        'Cadet': 'salary_cadet',
        'Second Officer': 'salary_second_officer',
        'First Officer': 'salary_first_officer',
        'Senior First Officer': 'salary_senior_first_officer',
        'Captain': 'salary_captain',
        'Senior Captain': 'salary_senior_captain',
        'Check Airman': 'salary_check_airman',
    };
    return map[rank] || 'salary_cadet';
}

// Weekly pilot salary payment
// Runs once per week via Vercel Cron (e.g., every Monday at 00:00 UTC)
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const config = await GlobalConfig.findOne({ key: 'LVT_MAIN' });
        if (!config || !config.salary_enabled) {
            return NextResponse.json({ success: true, message: 'Salary system disabled', paid: 0 });
        }

        // Find all active pilots
        const pilots = await PilotModel.find({ status: 'Active' }).select('pilot_id first_name last_name rank balance');

        let totalPaid = 0;
        let pilotsPaid = 0;
        const breakdown: Record<string, { count: number; amount: number }> = {};

        for (const pilot of pilots) {
            const salaryKey = getSalaryKey(pilot.rank);
            const salary = (config as any)[salaryKey] || 0;

            if (salary <= 0) continue;

            pilot.balance = (pilot.balance || 0) + salary;
            await pilot.save();

            totalPaid += salary;
            pilotsPaid++;

            if (!breakdown[pilot.rank]) breakdown[pilot.rank] = { count: 0, amount: 0 };
            breakdown[pilot.rank].count++;
            breakdown[pilot.rank].amount += salary;
        }

        // Log it
        if (totalPaid > 0) {
            await FinanceLog.create({
                type: 'Weekly Salary',
                amount: -totalPaid,
                description: `Weekly pilot salaries paid to ${pilotsPaid} active pilots. Total: ${totalPaid.toLocaleString()} Cr`,
            });
        }

        // Discord notification
        try {
            const breakdownLines = Object.entries(breakdown)
                .map(([rank, data]) => `**${rank}** — ${data.count} pilot${data.count > 1 ? 's' : ''} × \`${(data.amount / data.count).toLocaleString()} Cr\` = \`${data.amount.toLocaleString()} Cr\``)
                .join('\n');

            await sendDiscordNotification('', [{
                author: { name: 'WEEKLY PAYROLL', icon_url: 'https://levant-va.com/img/logo.png' },
                title: '💰 Pilot Salaries Processed',
                description: [
                    `> Weekly salary payments have been distributed.`,
                    '',
                    breakdownLines || 'No salaries to distribute.',
                    '',
                    `**Total Paid:** \`${totalPaid.toLocaleString()} Cr\``,
                    `**Pilots Paid:** ${pilotsPaid}`,
                ].join('\n'),
                color: 0x2ECC71,
                footer: { text: 'Levant Virtual Airlines • Payroll System' },
                timestamp: new Date().toISOString(),
            }], 'finance');
        } catch { /* non-fatal */ }

        return NextResponse.json({
            success: true,
            totalPaid,
            pilotsPaid,
            breakdown,
        });
    } catch (error: any) {
        console.error('Weekly salary cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
