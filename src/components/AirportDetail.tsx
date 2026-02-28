'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Cloud, Wind, Thermometer, Radio, Navigation, Plane, Clock } from 'lucide-react';
import Link from 'next/link';

interface AirportDetailProps {
    icao: string;
}

export default function AirportDetail({ icao }: AirportDetailProps) {
    const [airport, setAirport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAirport();
    }, [icao]);

    const fetchAirport = async () => {
        try {
            const res = await fetch(`/api/airports/${icao}`);
            if (res.ok) {
                const data = await res.json();
                setAirport(data);
            }
        } catch (err) {
            console.error('Error fetching airport:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!airport) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Link href="/portal/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
                <div className="text-center text-gray-400 py-12">Airport not found</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Back Link */}
            <Link href="/portal/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-bold text-accent-gold font-mono">{airport.icao}</span>
                            {airport.iata && (
                                <span className="text-lg text-gray-400 font-mono">/ {airport.iata}</span>
                            )}
                        </div>
                        <h1 className="text-xl text-white mb-1">{airport.name}</h1>
                        {airport.city && (
                            <p className="text-gray-400">{airport.city}, {airport.country}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Elevation</div>
                        <div className="text-xl text-white font-bold">{airport.altitude?.toLocaleString() || 0} ft</div>
                    </div>
                </div>
            </div>

            {/* Map placeholder + METAR */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Map */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-accent-gold" />
                        Location
                    </h3>
                    <div className="h-64 bg-[#111] rounded-lg flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">Lat: {airport.lat?.toFixed(4)}</div>
                            <div className="text-sm">Lng: {airport.lng?.toFixed(4)}</div>
                        </div>
                    </div>
                </div>

                {/* Weather */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-accent-gold" />
                        Weather & METAR
                    </h3>
                    {airport.metar ? (
                        <div className="space-y-4">
                            <div className="bg-[#111]/50 rounded-lg p-4">
                                <div className="text-xs text-gray-400 mb-2">Raw METAR</div>
                                <div className="text-sm text-gray-200 font-mono break-all">
                                    {airport.metar.rawOb || airport.metar.raw}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                {airport.metar.temp !== undefined && (
                                    <div className="bg-[#111]/30 rounded-lg p-3 text-center">
                                        <Thermometer className="w-5 h-5 mx-auto text-orange-400 mb-2" />
                                        <div className="text-lg text-white font-bold">{airport.metar.temp}°C</div>
                                        <div className="text-xs text-gray-500">Temperature</div>
                                    </div>
                                )}
                                {airport.metar.wspd !== undefined && (
                                    <div className="bg-[#111]/30 rounded-lg p-3 text-center">
                                        <Wind className="w-5 h-5 mx-auto text-blue-400 mb-2" />
                                        <div className="text-lg text-white font-bold">
                                            {airport.metar.wdir}° / {airport.metar.wspd}kt
                                        </div>
                                        <div className="text-xs text-gray-500">Wind</div>
                                    </div>
                                )}
                                {airport.metar.visib !== undefined && (
                                    <div className="bg-[#111]/30 rounded-lg p-3 text-center">
                                        <Cloud className="w-5 h-5 mx-auto text-gray-400 mb-2" />
                                        <div className="text-lg text-white font-bold">{airport.metar.visib} SM</div>
                                        <div className="text-xs text-gray-500">Visibility</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            No METAR data available
                        </div>
                    )}
                </div>
            </div>

            {/* Runways */}
            {airport.runways?.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Plane className="w-5 h-5 text-accent-gold" />
                        Runway Information
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-white/10">
                                    <th className="pb-3">Runway</th>
                                    <th className="pb-3">Length</th>
                                    <th className="pb-3">Width</th>
                                    <th className="pb-3">Surface</th>
                                    <th className="pb-3">Heading</th>
                                    <th className="pb-3">Elevation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {airport.runways.map((rwy: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/[0.06]">
                                        <td className="py-3 text-white font-mono font-bold">{rwy.name}</td>
                                        <td className="py-3 text-gray-300">{rwy.length?.toLocaleString()} ft</td>
                                        <td className="py-3 text-gray-300">{rwy.width?.toLocaleString()} ft</td>
                                        <td className="py-3 text-gray-300">{rwy.surface || '-'}</td>
                                        <td className="py-3 text-gray-300">{rwy.heading}°</td>
                                        <td className="py-3 text-gray-300">{rwy.elevation ? `${rwy.elevation} ft` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Frequencies & Navaids */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Frequencies */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Radio className="w-5 h-5 text-accent-gold" />
                        Frequencies
                    </h3>
                    {airport.frequencies?.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {airport.frequencies.map((freq: any, idx: number) => (
                                <div key={idx} className="flex justify-between py-2 border-b border-white/[0.06]">
                                    <span className="text-gray-400">{freq.type}</span>
                                    <span className="text-white font-mono">{freq.frequency?.toFixed(3)} MHz</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">No frequencies available</p>
                    )}
                </div>

                {/* Navaids */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-accent-gold" />
                        Navaids
                    </h3>
                    {airport.navaids?.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {airport.navaids.map((nav: any, idx: number) => (
                                <div key={idx} className="flex justify-between py-2 border-b border-white/[0.06]">
                                    <div>
                                        <span className="text-white font-mono mr-2">{nav.ident}</span>
                                        <span className="text-xs text-gray-500">{nav.type}</span>
                                    </div>
                                    <span className="text-gray-300 font-mono">{nav.frequency} kHz</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">No navaids available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
