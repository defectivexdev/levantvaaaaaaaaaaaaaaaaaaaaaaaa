import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface AirportData {
    country_code: string;
    region_name: string;
    iata: string;
    icao: string;
    airport: string;
}

let cachedAirports: AirportData[] | null = null;

export function getAirports(): AirportData[] {
    if (cachedAirports) return cachedAirports;

    try {
        const filePath = path.join(process.cwd(), 'public', 'files', 'iata-icao.csv');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        cachedAirports = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        return cachedAirports || [];
    } catch (error) {
        console.error('Failed to load airport DB:', error);
        return [];
    }
}

export function searchAirports(query: string): AirportData[] {
    const all = getAirports();
    const q = query.toLowerCase();
    
    // Exact ICAO match first
    const exact = all.find(a => a.icao.toLowerCase() === q);
    if (exact) return [exact];

    // Then fuzzy search (limit to 20 results)
    return all.filter(a => 
        (a.icao && a.icao.toLowerCase().includes(q)) || 
        (a.airport && a.airport.toLowerCase().includes(q)) ||
        (a.iata && a.iata.toLowerCase().includes(q)) ||
        (a.region_name && a.region_name.toLowerCase().includes(q))
    ).slice(0, 20);
}

export function getAirportByICAO(icao: string): AirportData | undefined {
    const all = getAirports();
    return all.find(a => a.icao === icao);
}
