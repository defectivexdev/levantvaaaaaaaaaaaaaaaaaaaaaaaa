import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    try {
        const simbriefUrl = `https://www.simbrief.com/api/xml.fetcher.php?userid=${username}&json=v2`;
        const response = await fetch(simbriefUrl, { next: { revalidate: 60 } }); // Cache for 1 min

        if (!response.ok) {
            throw new Error('Failed to fetch from SimBrief');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch flight plan' },
            { status: 500 }
        );
    }
}
