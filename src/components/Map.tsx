'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plane } from 'lucide-react';

// SVG aircraft icon with heading rotation — matches DashboardMap style
const createAircraftIcon = (heading: number) => {
    return L.divIcon({
        html: `<svg width="28" height="28" viewBox="0 0 256 256" fill="none"
                style="transform:rotate(${heading}deg);transform-origin:center center;filter:drop-shadow(0 2px 6px rgba(0,163,255,0.4))">
            <path d="M128 24 L140 108 L208 140 L208 156 L140 136 L140 200 L168 220 L168 232 L128 216 L88 232 L88 220 L116 200 L116 136 L48 156 L48 140 L116 108 Z"
                  fill="#00A3FF" stroke="#0077CC" stroke-width="2" stroke-linejoin="round"/>
        </svg>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
};

export interface MapFlight {
    callsign: string;
    pilot_name?: string;
    pilot?: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    ground_speed?: number;
    groundspeed?: number;
    groundSpeed?: number;
    departure_icao?: string;
    departure?: string;
    arrival_icao?: string;
    arrival?: string;
    aircraft_type?: string;
    equipment?: string;
    status?: string;
    phase?: string;
    ias?: number;
    verticalSpeed?: number;
    vertical_speed?: number;
    vs?: number;
    comfort_score?: number;
    fuel?: number;
}

// Helper: normalize field names (supports both /api/flights and /api/acars/live-map formats)
function norm(f: MapFlight) {
    return {
        callsign: f.callsign,
        pilot: f.pilot || f.pilot_name || '',
        dep: f.departure || f.departure_icao || '',
        arr: f.arrival || f.arrival_icao || '',
        equip: f.equipment || f.aircraft_type || '',
        lat: f.latitude,
        lng: f.longitude,
        alt: Math.round(f.altitude || 0),
        hdg: Math.round(f.heading || 0),
        gs: Math.round(f.ground_speed || f.groundspeed || f.groundSpeed || 0),
        ias: Math.round(f.ias || 0),
        vs: Math.round(f.verticalSpeed || f.vertical_speed || f.vs || 0),
        phase: f.phase || f.status || '',
        comfort: f.comfort_score ?? 100,
        fuel: f.fuel || 0,
    };
}

// Stale icon: same SVG but at 50% opacity for disconnected pilots
const createStaleIcon = (heading: number) => {
    return L.divIcon({
        html: `<svg width="28" height="28" viewBox="0 0 256 256" fill="none"
                style="transform:rotate(${heading}deg);transform-origin:center center;opacity:0.4;filter:drop-shadow(0 1px 3px rgba(100,100,100,0.3))">
            <path d="M128 24 L140 108 L208 140 L208 156 L140 136 L140 200 L168 220 L168 232 L128 216 L88 232 L88 220 L116 200 L116 136 L48 156 L48 140 L116 108 Z"
                  fill="#6b7280" stroke="#4b5563" stroke-width="2" stroke-linejoin="round"/>
        </svg>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
};

const FADE_AFTER_MS = 60_000;   // fade to 50% after 60s no update
const REMOVE_AFTER_MS = 120_000; // remove after 2 min no update

// Smooth marker animation — interpolate positions, fade disconnected pilots
function SmoothMarkers({ flights }: { flights: MapFlight[] }) {
    const map = useMap();
    const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
    const prevPositions = useRef<globalThis.Map<string, { lat: number; lng: number }>>(new globalThis.Map());
    const lastSeenRef = useRef<globalThis.Map<string, number>>(new globalThis.Map());
    const lastHeadingRef = useRef<globalThis.Map<string, number>>(new globalThis.Map());
    const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Periodic check: fade stale markers, remove dead ones
    useEffect(() => {
        fadeTimerRef.current = setInterval(() => {
            const now = Date.now();
            markersRef.current.forEach((marker, callsign) => {
                const lastSeen = lastSeenRef.current.get(callsign) || now;
                const elapsed = now - lastSeen;

                if (elapsed > REMOVE_AFTER_MS) {
                    // Remove completely
                    marker.remove();
                    markersRef.current.delete(callsign);
                    prevPositions.current.delete(callsign);
                    lastSeenRef.current.delete(callsign);
                    lastHeadingRef.current.delete(callsign);
                } else if (elapsed > FADE_AFTER_MS) {
                    // Fade to stale icon
                    const hdg = lastHeadingRef.current.get(callsign) || 0;
                    marker.setIcon(createStaleIcon(hdg));
                }
            });
        }, 5000); // check every 5s

        return () => {
            if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const currentCallsigns = new Set<string>();

        flights.forEach((flight) => {
            if (typeof flight.latitude !== 'number' || typeof flight.longitude !== 'number') return;
            const n = norm(flight);
            currentCallsigns.add(n.callsign);

            // Mark as seen now
            lastSeenRef.current.set(n.callsign, Date.now());
            lastHeadingRef.current.set(n.callsign, n.hdg);

            const targetLat = n.lat;
            const targetLng = n.lng;

            let marker = markersRef.current.get(n.callsign);

            if (!marker) {
                // Create new marker
                marker = L.marker([targetLat, targetLng], {
                    icon: createAircraftIcon(n.hdg),
                });
                marker.addTo(map);
                markersRef.current.set(n.callsign, marker);
                prevPositions.current.set(n.callsign, { lat: targetLat, lng: targetLng });
            } else {
                // Animate to new position
                const prev = prevPositions.current.get(n.callsign) || { lat: targetLat, lng: targetLng };
                const steps = 30;
                let step = 0;

                const animate = () => {
                    step++;
                    const t = step / steps;
                    // Ease-out quad
                    const ease = t * (2 - t);
                    const lat = prev.lat + (targetLat - prev.lat) * ease;
                    const lng = prev.lng + (targetLng - prev.lng) * ease;
                    marker!.setLatLng([lat, lng]);
                    if (step < steps) {
                        requestAnimationFrame(animate);
                    }
                };

                if (Math.abs(targetLat - prev.lat) > 0.0001 || Math.abs(targetLng - prev.lng) > 0.0001) {
                    animate();
                }

                prevPositions.current.set(n.callsign, { lat: targetLat, lng: targetLng });
                // Restore active icon (in case it was stale)
                marker.setIcon(createAircraftIcon(n.hdg));
            }

            // Build popup content
            const comfortColor = n.comfort > 70 ? '#10b981' : n.comfort > 40 ? '#eab308' : '#ef4444';
            const vsColor = n.vs > 0 ? '#10b981' : n.vs < 0 ? '#ef4444' : '#9ca3af';
            const vsSign = n.vs > 0 ? '+' : '';
            const phaseBadgeColor =
                n.phase === 'Cruise' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                n.phase === 'Descent' || n.phase === 'Approach' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                n.phase === 'Climb' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                'bg-gray-500/10 text-gray-400 border-gray-500/20';

            marker.unbindPopup();
            marker.bindPopup(
                `<div class="lv-popup bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-2xl overflow-hidden min-w-[260px] text-white">
                    <div class="bg-[#242424] p-3 border-b border-gray-800 flex justify-between items-center">
                        <div>
                            <div class="text-[#00A3FF] font-mono font-bold text-sm leading-tight">${n.callsign}</div>
                            <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">${n.pilot}</div>
                        </div>
                        <div class="px-2 py-0.5 bg-gray-800 rounded text-[9px] font-mono font-bold text-gray-400 border border-gray-700">${n.equip}</div>
                    </div>
                    <div class="p-4 space-y-3">
                        <div class="flex items-center justify-between text-center gap-3">
                            <div class="flex-1">
                                <div class="text-[8px] text-gray-600 uppercase font-bold tracking-widest mb-1">DEP</div>
                                <div class="text-sm font-bold font-mono text-white">${n.dep}</div>
                            </div>
                            <div class="text-gray-700 text-xs">✈</div>
                            <div class="flex-1">
                                <div class="text-[8px] text-gray-600 uppercase font-bold tracking-widest mb-1">ARR</div>
                                <div class="text-sm font-bold font-mono text-white">${n.arr}</div>
                            </div>
                        </div>
                        ${n.phase ? `<div class="flex justify-center"><span class="text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${phaseBadgeColor}">${n.phase}</span></div>` : ''}
                        <div class="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg border border-gray-800/50">
                            <div class="text-center">
                                <div class="text-[7px] text-gray-500 uppercase font-bold mb-1">ALT</div>
                                <div class="text-[10px] font-mono font-bold text-white">${n.alt.toLocaleString()}<span class="text-[7px] text-gray-600">ft</span></div>
                            </div>
                            <div class="text-center border-x border-gray-800/50">
                                <div class="text-[7px] text-gray-500 uppercase font-bold mb-1">GS</div>
                                <div class="text-[10px] font-mono font-bold text-white">${n.gs}<span class="text-[7px] text-gray-600">kts</span></div>
                            </div>
                            <div class="text-center">
                                <div class="text-[7px] text-gray-500 uppercase font-bold mb-1">V/S</div>
                                <div class="text-[10px] font-mono font-bold" style="color:${vsColor}">${vsSign}${n.vs}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div class="text-[7px] text-gray-600 uppercase font-bold">IAS</div>
                                <div class="text-[9px] font-mono text-gray-400">${n.ias} kt</div>
                            </div>
                            <div>
                                <div class="text-[7px] text-gray-600 uppercase font-bold">HDG</div>
                                <div class="text-[9px] font-mono text-gray-400">${n.hdg}°</div>
                            </div>
                            <div>
                                <div class="text-[7px] text-gray-600 uppercase font-bold">FUEL</div>
                                <div class="text-[9px] font-mono text-gray-400">${n.fuel ? Math.round(n.fuel) + 'lb' : '—'}</div>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-gray-800/50">
                            <div class="flex justify-between items-center mb-1.5 px-0.5">
                                <div class="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Pax Comfort</div>
                                <div class="text-[10px] font-mono font-bold" style="color:${comfortColor}">${Math.round(n.comfort)}%</div>
                            </div>
                            <div class="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                                <div class="h-full rounded-full" style="width:${n.comfort}%;background:${comfortColor};transition:width 0.7s"></div>
                            </div>
                        </div>
                    </div>
                </div>`,
                { className: 'lv-map-popup', offset: [0, -5], maxWidth: 300 }
            );
        });

        // Note: we do NOT remove missing flights immediately.
        // The fade timer handles stale cleanup gracefully.
        // Only remove if the API poll explicitly excludes them AND they've been stale long enough.
        markersRef.current.forEach((_, callsign) => {
            if (!currentCallsigns.has(callsign)) {
                // Don't remove yet — let the fade timer handle it.
                // But don't refresh lastSeen, so the clock keeps ticking.
            }
        });
    }, [flights, map]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current.clear();
            prevPositions.current.clear();
            lastSeenRef.current.clear();
            lastHeadingRef.current.clear();
        };
    }, []);

    return null;
}

interface MapProps {
    flights: MapFlight[];
}

export default function Map({ flights }: MapProps) {
    const validFlights = useMemo(
        () => flights.filter(f => f && typeof f.latitude === 'number' && typeof f.longitude === 'number'),
        [flights]
    );

    return (
        <>
            <MapContainer
                center={[29.0, 40.0]}
                zoom={4}
                className="h-full w-full"
                style={{ background: '#0B0E11' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <SmoothMarkers flights={validFlights} />
            </MapContainer>
            <style jsx global>{`
                .lv-map-popup .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 12px !important;
                }
                .lv-map-popup .leaflet-popup-content {
                    margin: 0 !important;
                }
                .lv-map-popup .leaflet-popup-tip {
                    background: #242424 !important;
                    opacity: 0.9 !important;
                }
                .lv-map-popup .leaflet-popup-close-button {
                    color: #6b7280 !important;
                    top: 6px !important;
                    right: 8px !important;
                    font-size: 16px !important;
                }
                .lv-map-popup .leaflet-popup-close-button:hover {
                    color: #fff !important;
                }
            `}</style>
        </>
    );
}
