import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pilotId, departure, arrival, aircraft } = body;

        if (!pilotId || pilotId === '') {
            return NextResponse.json({ error: 'SimBrief Username/ID required. Please set it in Settings.' }, { status: 400 });
        }

        // SimBrief XML Fetcher - This fetches the LATEST generated plan for the user
        // Note: Actual "generation" (new computation) usually requires user interaction in the browser
        // for free tier, but the Dispatch page fetches the result here.
        const simbriefUrl = `https://www.simbrief.com/api/xml.fetcher.php?userid=${pilotId}&json=v2`;
        const response = await fetch(simbriefUrl, { next: { revalidate: 0 } });

        if (!response.ok) {
            throw new Error('Failed to fetch from SimBrief');
        }

        const data = await response.json();

        if (data.fetch && data.fetch.status === 'Success') {
            return NextResponse.json({
                success: true,
                ofp: data
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                error: data.fetch?.status || 'No flight plan found for this user.' 
            });
        }
    } catch (error: any) {
        console.error('SimBrief generate proxy error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to interface with SimBrief' },
            { status: 500 }
        );
    }
}
