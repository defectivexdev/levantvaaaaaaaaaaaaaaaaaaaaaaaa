'use client';
import { useState, useEffect } from 'react';
import { MapPin, Cloud, Wind, Thermometer } from 'lucide-react';
import Link from 'next/link';

interface CurrentAirportWidgetProps {
    icao?: string; // Pilot's current location
}

export default function CurrentAirportWidget({ icao = 'OJAI' }: CurrentAirportWidgetProps) {
    const [airport, setAirport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (icao) {
            fetchAirport(icao);
        }
    }, [icao]);

    const fetchAirport = async (code: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/airports/${code}`);
            if (res.ok) {
                const data = await res.json();
                setAirport(data);
            } else {
                setAirport(null);
            }
        } catch (err) {
            console.error('Error fetching airport:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent-gold" />
                    Current Location
                </h3>
                {airport && (
                    <Link 
                        href={`/portal/airport/${airport.icao}`}
                        className="text-xs text-accent-gold hover:underline"
                    >
                        View Details →
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full" />
                </div>
            ) : airport ? (
                <div className="space-y-4">
                    {/* Airport Info */}
                    <div>
                        <div className="text-2xl font-bold text-accent-gold font-mono">{airport.icao}</div>
                        <div className="text-sm text-gray-300">{airport.name}</div>
                        {airport.city && (
                            <div className="text-xs text-gray-500">{airport.city}, {airport.country}</div>
                        )}
                    </div>

                    {/* METAR */}
                    {airport.metar ? (
                        <div className="bg-[#111]/50 rounded-lg p-3 space-y-2">
                            <div className="text-xs text-gray-400 font-medium">METAR</div>
                            <div className="text-xs text-gray-300 font-mono break-all">
                                {airport.metar.rawOb || airport.metar.raw}
                            </div>
                            
                            {/* Parsed weather info */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
                                {airport.metar.temp !== undefined && (
                                    <div className="text-center">
                                        <Thermometer className="w-4 h-4 mx-auto text-orange-400 mb-1" />
                                        <div className="text-sm text-white font-bold">{airport.metar.temp}°C</div>
                                        <div className="text-[10px] text-gray-500">Temp</div>
                                    </div>
                                )}
                                {airport.metar.wspd !== undefined && (
                                    <div className="text-center">
                                        <Wind className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                                        <div className="text-sm text-white font-bold">{airport.metar.wspd}kt</div>
                                        <div className="text-[10px] text-gray-500">Wind</div>
                                    </div>
                                )}
                                {airport.metar.visib !== undefined && (
                                    <div className="text-center">
                                        <Cloud className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                                        <div className="text-sm text-white font-bold">{airport.metar.visib}SM</div>
                                        <div className="text-[10px] text-gray-500">Visibility</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 bg-[#111]/50 rounded-lg p-3">
                            No METAR available
                        </div>
                    )}

                    {/* Elevation */}
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Elevation</span>
                        <span className="text-white">{airport.altitude?.toLocaleString() || 0} ft</span>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-4">
                    Airport not found
                </div>
            )}
        </div>
    );
}
