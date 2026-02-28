

'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation2, MapPin, Plane } from 'lucide-react';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: (markerIcon as any).src || markerIcon,
    shadowUrl: (markerShadow as any).src || markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Dynamic Aircraft Icon - Clean & Flat
const createAircraftIcon = (heading: number, isGlobal?: boolean) => {
    const fill = isGlobal ? '#9ca3af' : '#60a5fa';
    const stroke = isGlobal ? '#6b7280' : '#3b82f6';
    return L.divIcon({
        html: `<svg width="24" height="24" viewBox="0 0 256 256" fill="none"
                style="transform:rotate(${heading}deg);transform-origin:center center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
            <path d="M128 24 L140 108 L208 140 L208 156 L140 136 L140 200 L168 220 L168 232 L128 216 L88 232 L88 220 L116 200 L116 136 L48 156 L48 140 L116 108 Z"
                  fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
        </svg>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

interface Flight {
    callsign: string;
    pilot: string;
    departure: string;
    arrival: string;
    equipment: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    groundSpeed: number;
    ias: number;
    verticalSpeed: number;
    fuel: number;
    phase: string;
    status: string;
    gForce?: number;
    comfort_score?: number;
    isGlobal?: boolean;
    network?: string;
}

export default function DashboardMap({ flights = [] }: { flights?: Flight[] }) {
    const [mounted, setMounted] = useState(false);
    const [mapKey] = useState(() => `map-${Date.now()}`);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-full w-full bg-[#0f0f0f] flex items-center justify-center">
                <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading Map...</div>
            </div>
        );
    }

    return (
        <>
            <MapContainer 
            key={mapKey}
            center={[20, 0]} 
            zoom={2} 
            style={{ height: '100%', width: '100%', background: '#0f0f0f' }}
            zoomControl={false}
            attributionControl={false}
            className="z-10"
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            {flights
                .filter(flight => 
                    flight && 
                    typeof flight.latitude === 'number' && 
                    typeof flight.longitude === 'number'
                )
                .map((flight, idx) => (
                    <Marker 
                        key={`${flight.callsign}-${idx}`} 
                        position={[flight.latitude, flight.longitude]}
                        icon={createAircraftIcon(Number(flight.heading) || 0, flight.isGlobal)}
                    >
                        <Popup className="custom-popup" offset={[0, -5]}>
                            <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-2xl overflow-hidden min-w-[260px] text-white">
                                {/* Header */}
                                <div className="bg-[#242424] p-3 border-b border-gray-800 flex justify-between items-center">
                                    <div>
                                        <div className="text-blue-400 font-mono font-bold text-sm leading-tight">{flight.callsign}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{flight.pilot}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {flight.network && flight.network !== 'LVT' && (
                                            <div className="px-1.5 py-0.5 bg-indigo-500/20 rounded text-[8px] font-bold text-indigo-400 border border-indigo-500/30">
                                                {flight.network}
                                            </div>
                                        )}
                                        <div className="px-2 py-0.5 bg-gray-800 rounded text-[9px] font-mono font-bold text-gray-400 border border-gray-700">
                                            {flight.equipment}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Route */}
                                    <div className="flex items-center justify-between text-center gap-4">
                                        <div className="flex-1">
                                            <div className="text-[8px] text-gray-600 uppercase font-bold tracking-widest mb-1">Departure</div>
                                            <div className="text-sm font-bold font-mono">{flight.departure}</div>
                                        </div>
                                        <Plane size={14} className="text-gray-700" />
                                        <div className="flex-1">
                                            <div className="text-[8px] text-gray-600 uppercase font-bold tracking-widest mb-1">Arrival</div>
                                            <div className="text-sm font-bold font-mono">{flight.arrival}</div>
                                        </div>
                                    </div>

                                    {/* Phase Badge */}
                                    {flight.phase && (
                                        <div className="flex justify-center">
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                flight.phase === 'Cruise' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                flight.phase === 'Descent' || flight.phase === 'Approach' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                flight.phase === 'Climb' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>{flight.phase}</span>
                                        </div>
                                    )}

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg border border-gray-800/50">
                                        <div className="text-center">
                                            <div className="text-[7px] text-gray-500 uppercase font-bold mb-1">ALT</div>
                                            <div className="text-[10px] font-mono font-bold">{Math.round(flight.altitude || 0).toLocaleString()}<span className="text-[7px] text-gray-600">ft</span></div>
                                        </div>
                                        <div className="text-center border-x border-gray-800/50">
                                            <div className="text-[7px] text-gray-500 uppercase font-bold mb-1">GS</div>
                                            <div className="text-[10px] font-mono font-bold">{Math.round(flight.groundSpeed || 0)} <span className="text-[7px] text-gray-600">KTS</span></div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[7px] text-gray-500 uppercase font-bold mb-1">V/S</div>
                                            <div className={`text-[10px] font-mono font-bold ${(flight.verticalSpeed || 0) > 0 ? 'text-emerald-500' : (flight.verticalSpeed || 0) < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                                {(flight.verticalSpeed || 0) > 0 ? '+' : ''}{Math.round(flight.verticalSpeed || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secondary Stats */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-[7px] text-gray-600 uppercase font-bold">IAS</div>
                                            <div className="text-[9px] font-mono text-gray-400">{Math.round(flight.ias || 0)} kt</div>
                                        </div>
                                        <div>
                                            <div className="text-[7px] text-gray-600 uppercase font-bold">HDG</div>
                                            <div className="text-[9px] font-mono text-gray-400">{Math.round(flight.heading || 0)}°</div>
                                        </div>
                                        <div>
                                            <div className="text-[7px] text-gray-600 uppercase font-bold">FUEL</div>
                                            <div className="text-[9px] font-mono text-gray-400">{flight.fuel ? `${Math.round(flight.fuel)}lb` : '—'}</div>
                                        </div>
                                    </div>

                                    {/* Passenger Comfort */}
                                    {!flight.isGlobal && (
                                        <div className="pt-2 border-t border-gray-800/50">
                                            <div className="flex justify-between items-center mb-1.5 px-0.5">
                                                <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Pax Satisfaction</div>
                                                <div className={`text-[10px] font-mono font-bold ${(!flight.comfort_score || flight.comfort_score > 70) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {flight.comfort_score ?? 100}%
                                                </div>
                                            </div>
                                            <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-700 ${(!flight.comfort_score || flight.comfort_score > 70) ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${flight.comfort_score ?? 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
        </MapContainer>
        <style jsx global>{`
            .custom-popup .leaflet-popup-content-wrapper {
                background: transparent !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }
            .custom-popup .leaflet-popup-tip {
                background: #1f2937 !important;
                opacity: 0.8 !important;
            }
        `}</style>
        </>
    );
}
