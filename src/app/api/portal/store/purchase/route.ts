import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import StoreItem from '@/models/StoreItem';
import Pilot from '@/models/Pilot';
import AirlineFinance from '@/models/AirlineFinance';
import GlobalConfig from '@/models/GlobalConfig';
import FinanceLog from '@/models/FinanceLog';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await verifyAuth();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await connectDB();

        const { itemId } = await request.json();

        if (!itemId) {
            return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
        }

        const item = await StoreItem.findById(itemId);
        if (!item || !item.active) {
            return NextResponse.json({ error: 'Item not found or inactive' }, { status: 404 });
        }

        const pilot = await Pilot.findById(auth.id);
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Check balance
        if (pilot.balance < item.price) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // Deduct balance and add to inventory
        pilot.balance -= item.price;
        
        // Add to inventory if not already there (for unique items like badges/ratings)
        if (!pilot.inventory.includes(item.id.toString())) {
            pilot.inventory.push(item.id.toString());
        }

        await pilot.save();

        // --- STORE → AIRLINE CR: Transfer purchase amount to airline fund ---
        try {
            const config = await GlobalConfig.findOne({ key: 'LVT_MAIN' }) || { store_to_airline_percent: 100 };
            const transferPercent = config.store_to_airline_percent ?? 100;
            const transferAmount = Math.round(item.price * (transferPercent / 100));

            if (transferAmount > 0) {
                let airlineFinance = await AirlineFinance.findOne();
                if (!airlineFinance) {
                    airlineFinance = await AirlineFinance.create({ balance: 0 });
                }
                airlineFinance.balance += transferAmount;
                airlineFinance.total_revenue += transferAmount;
                airlineFinance.last_updated = new Date();
                await airlineFinance.save();

                await FinanceLog.create({
                    pilot_id: pilot._id,
                    type: 'Store Revenue',
                    amount: transferAmount,
                    description: `Store purchase: ${item.name} (${transferPercent}% of ${item.price} Cr)`,
                    reference_id: item._id?.toString(),
                });
            }
        } catch (storeErr) {
            console.error('Store→Airline Cr transfer error (non-fatal):', storeErr);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Purchased ${item.name} successfully!`,
            newBalance: pilot.balance
        });

    } catch (error) {
        console.error('Error purchasing item:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
