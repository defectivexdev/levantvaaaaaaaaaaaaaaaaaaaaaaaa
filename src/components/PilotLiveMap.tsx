'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// SVG aircraft icon — Levant Blue with glow
const createPilotIcon = (heading: number) => {
    return L.divIcon({
        html: `<svg width="32" height="32" viewBox="0 0 256 256" fill="none"
                style="transform:rotate(${heading}deg);transform-origin:center center;filter:drop-shadow(0 2px 8px rgba(0,163,255,0.5))">
            <path d="M128 24 L140 108 L208 140 L208 156 L140 136 L140 200 L168 220 L168 232 L128 216 L88 232 L88 220 L116 200 L116 136 L48 156 L48 140 L116 108 Z"
                  fill="#00A3FF" stroke="#0077CC" stroke-width="2" stroke-linejoin="round"/>
        </svg>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

// Departure airport marker
const depIcon = L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#00D26A;border:2px solid #00A854;box-shadow:0 0 8px rgba(0,210,106,0.5)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

// Arrival airport marker
const arrIcon = L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#FF4757;border:2px solid #CC3844;box-shadow:0 0 8px rgba(255,71,87,0.5)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

/**
 * Compute intermediate points along a Great Circle arc between two coordinates.
 * Uses spherical interpolation (slerp) for accurate curved paths.
 */
function greatCircleArc(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
    segments = 64
): [number, number][] {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const φ1 = toRad(lat1), λ1 = toRad(lng1);
    const φ2 = toRad(lat2), λ2 = toRad(lng2);

    // Central angle (haversine)
    const dφ = φ2 - φ1;
    const dλ = λ2 - λ1;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    const d = 2 * Math.asin(Math.sqrt(a));

    if (d < 1e-10) return [[lat1, lng1], [lat2, lng2]];

    const points: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
        const f = i / segments;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
        const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
        const z = A * Math.sin(φ1) + B * Math.sin(φ2);

        const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
        const lng = toDeg(Math.atan2(y, x));
        points.push([lat, lng]);
    }
    return points;
}

interface PilotFlight {
    callsign: string;
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    groundSpeed?: number;
    groundspeed?: number;
    ground_speed?: number;
    departure?: string;
    departure_icao?: string;
    arrival?: string;
    arrival_icao?: string;
    equipment?: string;
    aircraft_type?: string;
    phase?: string;
    status?: string;
    ias?: number;
    verticalSpeed?: number;
    vertical_speed?: number;
}

interface AirportCoord {
    icao: string;
    lat: number;
    lng: number;
}

// Animate the map view and markers
function PilotTracker({ flight, depCoord, arrCoord }: {
    flight: PilotFlight;
    depCoord?: AirportCoord;
    arrCoord?: AirportCoord;
}) {
    const map = useMap();
    const markerRef = useRef<L.Marker | null>(null);
    const depMarkerRef = useRef<L.Marker | null>(null);
    const arrMarkerRef = useRef<L.Marker | null>(null);
    const prevPos = useRef<{ lat: number; lng: number } | null>(null);
    const hasCentered = useRef(false);

    useEffect(() => {
        if (typeof flight.latitude !== 'number' || typeof flight.longitude !== 'number') return;

        const lat = flight.latitude;
        const lng = flight.longitude;
        const hdg = Math.round(flight.heading || 0);

        // Center map on first render
        if (!hasCentered.current) {
            map.setView([lat, lng], 7, { animate: true });
            hasCentered.current = true;
        }

        // Aircraft marker
        if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { icon: createPilotIcon(hdg), zIndexOffset: 1000 });
            markerRef.current.addTo(map);
        } else {
            // Smooth animate
            const prev = prevPos.current || { lat, lng };
            const steps = 25;
            let step = 0;
            const animate = () => {
                step++;
                const t = step / steps;
                const ease = t * (2 - t);
                markerRef.current!.setLatLng([
                    prev.lat + (lat - prev.lat) * ease,
                    prev.lng + (lng - prev.lng) * ease,
                ]);
                if (step < steps) requestAnimationFrame(animate);
            };
            if (Math.abs(lat - prev.lat) > 0.0001 || Math.abs(lng - prev.lng) > 0.0001) {
                animate();
            }
            markerRef.current.setIcon(createPilotIcon(hdg));
        }

        prevPos.current = { lat, lng };

        // Build popup
        const gs = Math.round(flight.groundSpeed || flight.groundspeed || flight.ground_speed || 0);
        const vs = Math.round(flight.verticalSpeed || flight.vertical_speed || 0);
        const vsSign = vs > 0 ? '+' : '';
        const vsColor = vs > 0 ? '#10b981' : vs < 0 ? '#ef4444' : '#9ca3af';
        const dep = flight.departure || flight.departure_icao || '—';
        const arr = flight.arrival || flight.arrival_icao || '—';
        const equip = flight.equipment || flight.aircraft_type || '';

        markerRef.current.unbindPopup();
        markerRef.current.bindPopup(
            `<div class="lv-pilot-popup" style="background:#1a1a1a;border-radius:10px;border:1px solid #333;overflow:hidden;min-width:220px;color:#fff;font-family:system-ui,sans-serif">
                <div style="background:#242424;padding:10px 14px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <div style="color:#00A3FF;font-family:monospace;font-weight:700;font-size:14px">${flight.callsign}</div>
                        <div style="font-size:9px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1px">${dep} → ${arr}</div>
                    </div>
                    <div style="background:#333;padding:2px 8px;border-radius:4px;font-size:9px;font-family:monospace;color:#999;font-weight:700">${equip}</div>
                </div>
                <div style="padding:12px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                    <div>
                        <div style="font-size:8px;color:#666;font-weight:700;text-transform:uppercase;margin-bottom:3px">ALT</div>
                        <div style="font-size:11px;font-family:monospace;font-weight:700">${Math.round(flight.altitude || 0).toLocaleString()}<span style="font-size:8px;color:#666">ft</span></div>
                    </div>
                    <div>
                        <div style="font-size:8px;color:#666;font-weight:700;text-transform:uppercase;margin-bottom:3px">GS</div>
                        <div style="font-size:11px;font-family:monospace;font-weight:700">${gs}<span style="font-size:8px;color:#666">kts</span></div>
                    </div>
                    <div>
                        <div style="font-size:8px;color:#666;font-weight:700;text-transform:uppercase;margin-bottom:3px">V/S</div>
                        <div style="font-size:11px;font-family:monospace;font-weight:700;color:${vsColor}">${vsSign}${vs}</div>
                    </div>
                </div>
            </div>`,
            { className: 'lv-pilot-map-popup', offset: [0, -8], maxWidth: 260 }
        );

        // Departure marker
        if (depCoord && !depMarkerRef.current) {
            depMarkerRef.current = L.marker([depCoord.lat, depCoord.lng], { icon: depIcon, zIndexOffset: 500 });
            depMarkerRef.current.bindTooltip(depCoord.icao, {
                permanent: true, direction: 'bottom', className: 'lv-airport-label',
                offset: [0, 6],
            });
            depMarkerRef.current.addTo(map);
        }

        // Arrival marker
        if (arrCoord && !arrMarkerRef.current) {
            arrMarkerRef.current = L.marker([arrCoord.lat, arrCoord.lng], { icon: arrIcon, zIndexOffset: 500 });
            arrMarkerRef.current.bindTooltip(arrCoord.icao, {
                permanent: true, direction: 'bottom', className: 'lv-airport-label',
                offset: [0, 6],
            });
            arrMarkerRef.current.addTo(map);
        }

        return () => {};
    }, [flight, map, depCoord, arrCoord]);

    // Cleanup
    useEffect(() => {
        return () => {
            markerRef.current?.remove();
            depMarkerRef.current?.remove();
            arrMarkerRef.current?.remove();
        };
    }, []);

    return null;
}

interface PilotLiveMapProps {
    flight: PilotFlight;
    depCoord?: { lat: number; lng: number };
    arrCoord?: { lat: number; lng: number };
}

export default function PilotLiveMap({ flight, depCoord, arrCoord }: PilotLiveMapProps) {
    if (!flight || typeof flight.latitude !== 'number' || typeof flight.longitude !== 'number') {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#0B0E11] rounded-xl">
                <div className="text-gray-600 text-xs uppercase tracking-widest">No active flight</div>
            </div>
        );
    }

    const dep = flight.departure || flight.departure_icao || '';
    const arr = flight.arrival || flight.arrival_icao || '';

    // Build polyline: departure → current position (great circle arc)
    const trailPoints: [number, number][] = depCoord
        ? greatCircleArc(depCoord.lat, depCoord.lng, flight.latitude, flight.longitude, 48)
        : [[flight.latitude, flight.longitude]];

    // Full route line (dashed great circle arc): departure → arrival
    const routePoints: [number, number][] =
        depCoord && arrCoord
            ? greatCircleArc(depCoord.lat, depCoord.lng, arrCoord.lat, arrCoord.lng, 64)
            : [];

    const depAirport = depCoord ? { icao: dep, lat: depCoord.lat, lng: depCoord.lng } : undefined;
    const arrAirport = arrCoord ? { icao: arr, lat: arrCoord.lat, lng: arrCoord.lng } : undefined;

    return (
        <>
            <MapContainer
                center={[flight.latitude, flight.longitude]}
                zoom={7}
                className="h-full w-full rounded-xl"
                style={{ background: '#0B0E11' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Full route — great circle arc (dashed gray) */}
                {routePoints.length >= 2 && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{ color: '#333', weight: 1.5, dashArray: '8,6', opacity: 0.5 }}
                    />
                )}

                {/* Flown trail — great circle arc (solid accent) */}
                {trailPoints.length >= 2 && (
                    <Polyline
                        positions={trailPoints}
                        pathOptions={{ color: '#00A3FF', weight: 2.5, opacity: 0.8 }}
                    />
                )}

                <PilotTracker flight={flight} depCoord={depAirport} arrCoord={arrAirport} />
            </MapContainer>
            <style jsx global>{`
                .lv-pilot-map-popup .leaflet-popup-content-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 10px !important;
                }
                .lv-pilot-map-popup .leaflet-popup-content {
                    margin: 0 !important;
                }
                .lv-pilot-map-popup .leaflet-popup-tip {
                    background: #242424 !important;
                    opacity: 0.9 !important;
                }
                .lv-pilot-map-popup .leaflet-popup-close-button {
                    color: #666 !important;
                    top: 4px !important;
                    right: 6px !important;
                }
                .lv-airport-label {
                    background: rgba(11,14,17,0.85) !important;
                    border: 1px solid #333 !important;
                    border-radius: 4px !important;
                    padding: 2px 6px !important;
                    font-size: 9px !important;
                    font-weight: 700 !important;
                    font-family: monospace !important;
                    color: #999 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    box-shadow: none !important;
                }
                .lv-airport-label::before {
                    display: none !important;
                }
            `}</style>
        </>
    );
}
