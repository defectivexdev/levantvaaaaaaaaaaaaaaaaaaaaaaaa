import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RefreshCw, Plane, Users } from 'lucide-react';
import { fetchTraffic, type TrafficFlight } from '../api';
import type { TelemetryData, TouchdownPoint } from '../types';

// Fix Leaflet default icon issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Aircraft icon as rotatable SVG
function createAircraftIcon(heading: number, isOwnFlight: boolean) {
  const color = isOwnFlight ? '#d4af37' : '#00a3ff';
  const glow = isOwnFlight ? 'drop-shadow(0 0 6px rgba(212,175,55,0.8))' : 'drop-shadow(0 0 4px rgba(0,163,255,0.6))';
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="transform:rotate(${heading}deg);filter:${glow};width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="${color}" stroke="${color}" stroke-width="0.5">
        <path d="M12 2L8 10H3L5 13H8L10 22H14L16 13H19L21 10H16L12 2Z"/>
      </svg>
    </div>`,
  });
}

// Auto-fit bounds when traffic changes
function FitBounds({ flights }: { flights: TrafficFlight[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (flights.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(flights.map(f => [f.latitude, f.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      fitted.current = true;
    }
  }, [flights, map]);

  return null;
}

// Follow own aircraft position — pans map smoothly when telemetry updates
function FollowAircraft({ lat, lon, follow }: { lat: number; lon: number; follow: boolean }) {
  const map = useMap();
  const prevPos = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    if (!follow || lat === 0 || lon === 0) return;
    // Only pan if position actually changed (avoid jitter)
    if (Math.abs(lat - prevPos.current[0]) > 0.0001 || Math.abs(lon - prevPos.current[1]) > 0.0001) {
      map.panTo([lat, lon], { animate: true, duration: 1.0 });
      prevPos.current = [lat, lon];
    }
  }, [lat, lon, follow, map]);

  return null;
}

// Altitude → color mapping for flight trail
function getAltColor(alt: number): string {
  if (alt < 500) return '#ef4444';   // Red — ground/taxi
  if (alt < 5000) return '#f59e0b';  // Amber — low altitude
  if (alt < 15000) return '#22c55e'; // Green — mid altitude
  if (alt < 30000) return '#3b82f6'; // Blue — cruise
  return '#a78bfa';                  // Purple — high cruise FL300+
}

interface TrailPoint {
  pos: [number, number];
  alt: number;
  gs: number;
  phase: string;
  time: string;
  color: string;
}

// Haversine distance in meters (for trail point spacing)
function distMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  telemetry: TelemetryData;
  touchdownPoint?: TouchdownPoint | null;
}

const MAP_UPDATE_INTERVAL = 15; // seconds between map position jumps

export default function LiveMap({ telemetry, touchdownPoint }: Props) {
  const [traffic, setTraffic] = useState<TrafficFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selected, setSelected] = useState<TrafficFlight | null>(null);
  const [followAircraft, setFollowAircraft] = useState(true);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [showTrail, setShowTrail] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // ── 15-second buffered position update ────────────────────────
  const latestTelemetryRef = useRef(telemetry);
  latestTelemetryRef.current = telemetry; // always store latest silently

  const [displayPos, setDisplayPos] = useState<{ lat: number; lon: number; hdg: number }>({ lat: 0, lon: 0, hdg: 0 });
  const [countdown, setCountdown] = useState(MAP_UPDATE_INTERVAL);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          const t = latestTelemetryRef.current;
          if (t.latitude !== 0 || t.longitude !== 0) {
            setDisplayPos({ lat: t.latitude, lon: t.longitude, hdg: t.heading });
          }
          return MAP_UPDATE_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Seed initial position immediately when first valid telemetry arrives
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && telemetry.latitude !== 0 && telemetry.longitude !== 0) {
      setDisplayPos({ lat: telemetry.latitude, lon: telemetry.longitude, hdg: telemetry.heading });
      seeded.current = true;
    }
  }, [telemetry.latitude, telemetry.longitude, telemetry.heading]);

  // Record trail points when aircraft moves >50m
  useEffect(() => {
    if (telemetry.latitude === 0 && telemetry.longitude === 0) return;
    setTrail(prev => {
      const last = prev[prev.length - 1];
      if (last && distMeters(last.pos[0], last.pos[1], telemetry.latitude, telemetry.longitude) < 50) return prev;
      const pt: TrailPoint = {
        pos: [telemetry.latitude, telemetry.longitude],
        alt: telemetry.altitude,
        gs: telemetry.groundSpeed,
        phase: telemetry.phase || 'Unknown',
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        color: getAltColor(telemetry.altitude),
      };
      return [...prev, pt].slice(-1000);
    });
  }, [telemetry.latitude, telemetry.longitude, telemetry.altitude]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchTraffic();
    setTraffic(data);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-[0.15em] border bg-accent-gold/10 border-accent-gold/20 text-accent-gold uppercase">
            <Users size={10} />
            {traffic.length} Online
          </div>
          {lastRefresh && (
            <span className="text-xs text-gray-500 font-mono">
              Updated {lastRefresh.toLocaleTimeString('en-GB', { hour12: false })}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-white/5 relative">
          <MapContainer
            center={[33.8, 35.5]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#0a0e14' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
            <FitBounds flights={traffic} />
            {traffic.map((flight) => (
              <Marker
                key={flight.callsign}
                position={[flight.latitude, flight.longitude]}
                icon={createAircraftIcon(flight.heading, false)}
                eventHandlers={{ click: () => setSelected(flight) }}
              >
                <Popup>
                  <div style={{ color: '#fff', background: '#0f1318', padding: '8px 10px', borderRadius: '8px', minWidth: '180px', fontSize: '11px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#d4af37', marginBottom: '4px' }}>{flight.callsign}</div>
                    <div>{flight.pilotName}</div>
                    <div style={{ color: '#888' }}>{flight.departureIcao} → {flight.arrivalIcao}</div>
                    <div style={{ color: '#888' }}>{flight.aircraftType}</div>
                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                      <span style={{ color: '#00a3ff' }}>FL{Math.round(flight.altitude / 100)}</span>
                      <span style={{ margin: '0 6px', color: '#333' }}>·</span>
                      <span>{flight.groundSpeed} kts</span>
                      <span style={{ margin: '0 6px', color: '#333' }}>·</span>
                      <span>{flight.heading}°</span>
                    </div>
                    <div style={{ color: '#666', fontSize: '9px', marginTop: '2px' }}>{flight.phase}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Flight trail with clickable popups */}
            {showTrail && trail.length > 1 && trail.map((pt, i) => {
              if (i === 0) return null;
              const prev = trail[i - 1];
              return (
                <Polyline
                  key={i}
                  positions={[prev.pos, pt.pos]}
                  pathOptions={{ color: pt.color, weight: 3, opacity: 0.7 }}
                >
                  <Popup>
                    <div style={{ color: '#fff', background: '#0f1318', padding: '8px 10px', borderRadius: '8px', minWidth: '140px', fontSize: '11px', lineHeight: '1.6' }}>
                      <div style={{ fontWeight: 800, fontSize: '12px', color: pt.color, marginBottom: '2px' }}>Flight Snapshot</div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', marginTop: '2px' }}>
                        <div><b style={{ color: '#888' }}>ALT:</b> {pt.alt.toLocaleString()} ft</div>
                        <div><b style={{ color: '#888' }}>GS:</b> {pt.gs} kts</div>
                        <div><b style={{ color: '#888' }}>Phase:</b> {pt.phase}</div>
                        <div style={{ color: '#555', fontSize: '9px', marginTop: '2px' }}>{pt.time}</div>
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Own position marker — updates every 15s */}
            {displayPos.lat !== 0 && displayPos.lon !== 0 && (
              <Marker
                position={[displayPos.lat, displayPos.lon]}
                icon={createAircraftIcon(displayPos.hdg, true)}
              >
                <Popup>
                  <div style={{ color: '#d4af37', background: '#0f1318', padding: '8px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '12px' }}>
                    YOU — {telemetry.aircraftTitle}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Touchdown marker */}
            {touchdownPoint && touchdownPoint.latitude !== 0 && (
              <CircleMarker
                center={[touchdownPoint.latitude, touchdownPoint.longitude]}
                radius={8}
                pathOptions={{ color: '#d4af37', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div style={{ color: '#fff', background: '#0f1318', padding: '8px 10px', borderRadius: '8px', minWidth: '130px', fontSize: '11px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: '#ef4444', marginBottom: '2px' }}>Touchdown</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', marginTop: '2px' }}>
                      <div><b style={{ color: '#888' }}>Rate:</b> {touchdownPoint.landingRate} fpm</div>
                      <div><b style={{ color: '#888' }}>GS:</b> {touchdownPoint.groundSpeed} kts</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Auto-follow own aircraft — synced with 15s display position */}
            <FollowAircraft lat={displayPos.lat} lon={displayPos.lon} follow={followAircraft} />
          </MapContainer>

          {/* Countdown badge */}
          {displayPos.lat !== 0 && (
            <div className="absolute top-2 right-2 z-[1000] px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase border bg-[#0f1318]/90 border-white/10 text-gray-400 font-mono">
              Next update: <span className="text-accent-gold">{countdown}s</span>
            </div>
          )}

          {/* Map control buttons */}
          {displayPos.lat !== 0 && (
            <div className="absolute bottom-2 right-2 z-[1000] flex gap-1.5">
              <button
                onClick={() => setShowTrail(t => !t)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                  showTrail
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                }`}
              >
                Trail
              </button>
              <button
                onClick={() => setFollowAircraft(f => !f)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                  followAircraft
                    ? 'bg-accent-gold/20 border-accent-gold/30 text-accent-gold'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                }`}
              >
                <Plane size={10} />
                {followAircraft ? 'Following' : 'Follow'}
              </button>
            </div>
          )}
        </div>

        {/* Traffic List Sidebar */}
        <div className="w-[220px] flex flex-col bg-[#080c14] rounded-xl border border-white/[0.06] overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <div className="text-xs font-bold text-accent-gold/60 uppercase tracking-[0.2em]">Live Flights</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {traffic.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-3">
                <Plane size={20} className="text-gray-700 mb-2" />
                <p className="text-xs text-gray-600 font-mono">No active flights</p>
              </div>
            )}
            {traffic.map((f) => (
              <button
                key={f.callsign}
                onClick={() => setSelected(f)}
                className={`w-full text-left px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer bg-transparent border-none ${selected?.callsign === f.callsign ? 'bg-accent-gold/[0.06]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{f.callsign}</span>
                  <span className="text-xs font-mono text-gray-600">{f.phase}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {f.pilotName}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-mono text-accent-gold/70">{f.departureIcao}</span>
                  <span className="text-xs text-gray-700">→</span>
                  <span className="text-xs font-mono text-white/50">{f.arrivalIcao}</span>
                  <span className="text-xs text-gray-700 ml-auto">{f.aircraftType}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600">FL{Math.round(f.altitude / 100)}</span>
                  <span className="text-xs text-gray-600">{f.groundSpeed}kts</span>
                  <span className="text-xs text-gray-700 ml-auto">{timeSince(f.lastUpdate)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
