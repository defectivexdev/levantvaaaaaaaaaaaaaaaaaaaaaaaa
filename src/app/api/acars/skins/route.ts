import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import StoreItem from '@/models/StoreItem';
import Purchase from '@/models/Purchase';
import Pilot from '@/models/Pilot';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');

        if (!pilotId) {
            return NextResponse.json({ error: 'Pilot ID required' }, { status: 400 });
        }

        await connectDB();

        // Find pilot by pilot_id (string) to get _id (ObjectId)
        const pilot = await Pilot.findOne({ pilot_id: pilotId });
        if (!pilot) {
            return NextResponse.json({ error: 'Pilot not found' }, { status: 404 });
        }

        // Get all purchases for this pilot
        const purchases = await Purchase.find({ pilot_id: pilot.id });
        const ownedItemIds = purchases.map(p => p.item_id.toString());

        // Get all skin items that are owned
        const skins = await StoreItem.find({
            _id: { $in: ownedItemIds },
            category: 'Skin',
            active: true
        });

        return NextResponse.json({
            success: true,
            skins: skins.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                image: s.image,
                downloadUrl: s.download_url
            }))
        });
    } catch (error: any) {
        console.error('ACARS Skins API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
