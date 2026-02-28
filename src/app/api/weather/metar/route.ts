import { NextResponse } from 'next/server';

const AIRPORTS = ['OJAI', 'OSDI', 'ORBI'];

export async function GET() {
    try {
        const metarPromises = AIRPORTS.map(async (icao) => {
            try {
                const res = await fetch(`https://metar.vatsim.net/metar.php?id=${icao}`, { 
                    cache: 'no-store' 
                });
                
                if (res.ok) {
                    const text = await res.text();
                    const metar = text.trim();
                    
                    if (metar) {
                        return {
                            icao,
                            metar,
                            error: false
                        };
                    }
                }
                
                return { icao, metar: `No METAR for ${icao}`, error: true };
            } catch (error) {
                console.error(`Error fetching METAR for ${icao}:`, error);
                return { icao, metar: `No METAR for ${icao}`, error: true };
            }
        });

        const metars = await Promise.all(metarPromises);
        
        return NextResponse.json({ metars });
    } catch (error) {
        console.error('METAR API Error:', error);
        return NextResponse.json({ 
            metars: AIRPORTS.map(icao => ({ icao, metar: 'Service unavailable', error: true }))
        });
    }
}
