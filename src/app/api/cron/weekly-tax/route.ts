import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import AirlineFinance from '@/models/AirlineFinance';
import FinanceLog from '@/models/FinanceLog';
import { sendDiscordNotification } from '@/lib/discord';

// Randomize a number between min and max (inclusive)
function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Daily airline operations — fuel & catering purchases
// Runs at 00:00 UTC via Vercel Cron
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const finance = await AirlineFinance.findOne();
        if (!finance || finance.balance <= 0) {
            return NextResponse.json({ success: true, message: 'No balance to deduct', deducted: 0 });
        }

        // Generate random daily purchases
        const fuelBarrels = rand(80, 300);
        const fuelPricePerBarrel = rand(45, 85);
        const fuelCost = fuelBarrels * fuelPricePerBarrel;

        const mealSets = rand(50, 200);
        const mealPrice = rand(8, 25);
        const cateringCost = mealSets * mealPrice;

        const waterBottles = rand(100, 500);
        const waterPrice = rand(1, 3);
        const waterCost = waterBottles * waterPrice;

        const snackPacks = rand(30, 150);
        const snackPrice = rand(3, 10);
        const snackCost = snackPacks * snackPrice;

        const totalCost = fuelCost + cateringCost + waterCost + snackCost;
        const actualDeduction = Math.min(totalCost, finance.balance);

        finance.balance -= actualDeduction;
        finance.total_expenses += actualDeduction;
        finance.last_updated = new Date();
        await finance.save();

        const purchases = [
            { item: '⛽ Jet Fuel', qty: `${fuelBarrels} barrels`, cost: fuelCost },
            { item: '🍽️ In-Flight Meals', qty: `${mealSets} sets`, cost: cateringCost },
            { item: '💧 Bottled Water', qty: `${waterBottles} bottles`, cost: waterCost },
            { item: '🍫 Snack Packs', qty: `${snackPacks} packs`, cost: snackCost },
        ];

        await FinanceLog.create({
            type: 'Daily Operations',
            amount: -actualDeduction,
            description: `Daily fuel & catering: Fuel ${fuelCost.toLocaleString()} + Meals ${cateringCost.toLocaleString()} + Water ${waterCost.toLocaleString()} + Snacks ${snackCost.toLocaleString()} = ${actualDeduction.toLocaleString()} Cr`,
        });

        // Send Discord webhook notification
        try {
            const purchaseLines = purchases
                .map(p => `${p.item} — **${p.qty}** → \`${p.cost.toLocaleString()} Cr\``)
                .join('\n');

            await sendDiscordNotification('', [
                {
                    title: '🏦 Daily Operations Report',
                    color: 0xd4af37,
                    description: `The airline has completed today's procurement.\n\n${purchaseLines}`,
                    fields: [
                        { name: 'Total Deducted', value: `\`${actualDeduction.toLocaleString()} Cr\``, inline: true },
                        { name: 'Vault Balance', value: `\`${finance.balance.toLocaleString()} Cr\``, inline: true },
                    ],
                    footer: { text: 'Levant Virtual Airlines — Airline Vault' },
                    timestamp: new Date().toISOString(),
                }
            ], 'finance');
        } catch (webhookErr) {
            console.error('Discord webhook failed (non-fatal):', webhookErr);
        }

        return NextResponse.json({
            success: true,
            purchases,
            totalDeducted: actualDeduction,
            newBalance: finance.balance,
        });
    } catch (error: any) {
        console.error('Daily operations cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
