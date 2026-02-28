import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import DestinationOfTheMonth from '@/models/DestinationOfTheMonth';

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1470654936856662179/YaNYCbVhDxWOO51hVNAbxDJL3MEXtRCl2tAp95eT-xBNOWebkpTV0ScY2DO87yVTGqKB';

export async function GET() {
    try {
        await connectDB();
        const dotms = await DestinationOfTheMonth.find().sort({ created_at: -1 }).lean();
        return NextResponse.json({ dotms });
    } catch (error: any) {
        console.error('DOTM GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch DOTMs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const data = await request.json();

        const now = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Deactivate all existing DOTMs before creating a new active one
        if (data.is_active) {
            await DestinationOfTheMonth.updateMany({}, { is_active: false });
        }

        // Map frontend fields to model schema
        const dotmData = {
            airport_icao: (data.icao || data.airport_icao || '').toUpperCase(),
            month: monthNames[now.getMonth()],
            year: now.getFullYear(),
            bonus_points: data.bonus_points || 1000,
            bonus_percentage: data.bonus_percentage || 0,
            description: data.description || '',
            banner_image: data.banner_image || '',
            is_active: data.is_active ?? true,
        };

        // Upsert: if a DOTM for this month/year already exists, update it
        const dotm = await DestinationOfTheMonth.findOneAndUpdate(
            { month: dotmData.month, year: dotmData.year },
            dotmData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Post to Discord webhook
        try {
            const embed: any = {
                title: `🌍 Destination of the Month`,
                description: [
                    ``,
                    `━━━━━━━━━━━━━━━━━━━━━`,
                    ``,
                    `💰 **Bonus Reward:** \`${dotmData.bonus_points.toLocaleString()} Cr\``,
                    `Fly **in or out** of **${dotmData.airport_icao}** to earn bonus credits!`,
                    ``,
                    `━━━━━━━━━━━━━━━━━━━━━`,
                    ``,
                ].join('\n'),
                color: 0xEAB308,
                footer: {
                    text: 'Levant Virtual Airlines • Tours & Events',
                    icon_url: 'https://levant-va.com/img/logo.png',
                },
                timestamp: new Date().toISOString(),
            };
            if (dotmData.banner_image) {
                embed.image = { url: dotmData.banner_image };
            }

            await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'Levant Flight Ops',
                    avatar_url: 'https://levant-va.com/img/logo.png',
                    content: '📢 **New Destination of the Month has been announced!** @everyone',
                    embeds: [embed],
                }),
            });
        } catch (webhookErr) {
            console.error('Discord webhook error (non-fatal):', webhookErr);
        }

        return NextResponse.json({ success: true, dotm });
    } catch (error: any) {
        console.error('DOTM POST error:', error?.message || error);
        return NextResponse.json({ error: error?.message || 'Failed to create DOTM' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const data = await request.json();
        const { id, updates } = data;

        if (updates.is_active) {
            await DestinationOfTheMonth.updateMany({}, { is_active: false });
        }

        const dotm = await DestinationOfTheMonth.findByIdAndUpdate(id, updates, { new: true });
        return NextResponse.json({ success: true, dotm });
    } catch (error: any) {
        console.error('DOTM PUT error:', error);
        return NextResponse.json({ error: 'Failed to update DOTM' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await DestinationOfTheMonth.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DOTM DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete DOTM' }, { status: 500 });
    }
}
