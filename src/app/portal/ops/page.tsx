'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFlightSocket } from '@/hooks/useFlightSocket';
import { 
    Activity, 
    Wifi, 
    Users, 
    Map as MapIcon, 
    Clock, 
    Plane, 
    Globe, 
    Navigation,
    Loader2,
    Signal,
    Zap,
    AlertTriangle,
    Wind
} from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardMap = dynamic(() => import('@/components/DashboardMap'), { ssr: false });

export default function OpsCenterPage() {
    const [flights, setFlights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [networkFilter, setNetworkFilter] = useState<'off' | 'vatsim'>('off');
    const [stats, setStats] = useState({
        airborne: 0,
        preflight: 0,
        vatsim: 0
    });
    const [delays, setDelays] = useState<any[]>([]);
    const [wings, setWings] = useState<any[]>([]);

    // Fetch delays & flight wings every 30s
    useEffect(() => {
        const fetchExtras = async () => {
            try {
                const [dRes, wRes] = await Promise.all([
                    fetch('/api/portal/delays'),
                    fetch('/api/portal/flight-wings'),
                ]);
                const dData = await dRes.json();
                const wData = await wRes.json();
                if (dData.success) setDelays(dData.delays);
                if (wData.success) setWings(wData.wings);
            } catch { /* ignore */ }
        };
        fetchExtras();
        const interval = setInterval(fetchExtras, 30000);
        return () => clearInterval(interval);
    }, []);

    // Real-time Pusher — merge incoming flight updates instantly (add OR update)
    useFlightSocket(useCallback((data: any) => {
        if (!data?.callsign) return;
        setFlights(prev => {
            const exists = prev.some(f => f.callsign === data.callsign);
            if (exists) {
                return prev.map(f =>
                    f.callsign === data.callsign
                        ? { ...f, latitude: data.latitude, longitude: data.longitude, altitude: data.altitude, heading: data.heading, groundSpeed: data.groundSpeed ?? data.groundspeed ?? f.groundSpeed, ground_speed: data.groundSpeed ?? data.groundspeed ?? f.ground_speed, status: data.status, phase: data.phase ?? f.phase, ias: data.ias ?? f.ias, verticalSpeed: data.verticalSpeed ?? f.verticalSpeed, departure: data.departure ?? f.departure, arrival: data.arrival ?? f.arrival, equipment: data.equipment ?? f.equipment, comfort_score: data.comfort_score ?? f.comfort_score, fuel: data.fuel ?? f.fuel }
                        : f
                );
            }
            // New flight — add it
            return [...prev, {
                _id: data.callsign,
                callsign: data.callsign,
                pilot: data.pilot || '',
                pilot_name: data.pilot || '',
                departure: data.departure || '',
                departure_icao: data.departure || '',
                arrival: data.arrival || '',
                arrival_icao: data.arrival || '',
                equipment: data.equipment || '',
                aircraft_type: data.equipment || '',
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: data.altitude || 0,
                heading: data.heading || 0,
                groundSpeed: data.groundSpeed || data.groundspeed || 0,
                ground_speed: data.groundSpeed || data.groundspeed || 0,
                verticalSpeed: data.verticalSpeed || 0,
                ias: data.ias || 0,
                fuel: data.fuel || 0,
                phase: data.phase || data.status || '',
                status: data.phase || data.status || '',
                comfort_score: data.comfort_score || 100,
                network: 'LEVANT',
            }];
        });
    }, []));

    useEffect(() => {
        fetchFlights();
        const interval = setInterval(fetchFlights, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [networkFilter]); // Re-fetch when filter changes

    const fetchFlights = async () => {
        try {
            let allFlights: any[] = [];

            // Try ACARS traffic API first for Levant flights
            const trafficRes = await fetch('/api/acars?action=traffic');
            if (trafficRes.ok) {
                const tData = await trafficRes.json();
                if (tData.traffic && Array.isArray(tData.traffic) && tData.traffic.length > 0) {
                    allFlights = tData.traffic.map((f: any) => ({
                        _id: f.callsign,
                        callsign: f.callsign,
                        pilot: f.pilotName || f.pilot_name || '',
                        pilot_name: f.pilotName || f.pilot_name || '',
                        departure: f.departureIcao || f.departure_icao || '',
                        departure_icao: f.departureIcao || f.departure_icao || '',
                        arrival: f.arrivalIcao || f.arrival_icao || '',
                        arrival_icao: f.arrivalIcao || f.arrival_icao || '',
                        equipment: f.aircraftType || f.aircraft_type || '',
                        aircraft_type: f.aircraftType || f.aircraft_type || '',
                        latitude: f.latitude,
                        longitude: f.longitude,
                        altitude: f.altitude,
                        heading: f.heading,
                        groundSpeed: f.groundSpeed || f.ground_speed || 0,
                        ground_speed: f.groundSpeed || f.ground_speed || 0,
                        verticalSpeed: f.verticalSpeed || f.vertical_speed || 0,
                        ias: f.ias || 0,
                        fuel: f.fuel || 0,
                        phase: f.phase || f.status || '',
                        status: f.phase || f.status || '',
                        comfort_score: f.comfortScore || f.comfort_score || 100,
                        network: 'LEVANT',
                    }));
                }
            }

            // Fallback to portal ops/live endpoint
            if (allFlights.length === 0) {
                const res = await fetch(`/api/portal/ops/live?network=${networkFilter}`);
                const data = await res.json();
                if (data.flights) allFlights = data.flights;
            } else if (networkFilter === 'vatsim') {
                // If we got ACARS flights, still fetch VATSIM overlay
                const res = await fetch(`/api/portal/ops/live?network=vatsim`);
                const data = await res.json();
                if (data.flights) {
                    const vatsimOnly = data.flights.filter((f: any) => f.network !== 'LEVANT');
                    allFlights = [...allFlights, ...vatsimOnly];
                }
            }

            setFlights(allFlights);

            // Calculate mini stats (Levant Only)
            const levantFlights = allFlights.filter((f: any) => f.network === 'LEVANT');
            const airborne = levantFlights.filter((f: any) => f.status === 'Airborne' || f.altitude > 500).length;
            const preflight = levantFlights.length - airborne;

            setStats({
                airborne,
                preflight,
                vatsim: networkFilter === 'vatsim' ? allFlights.filter((f: any) => f.network !== 'LEVANT').length : 0
            });
        } catch (err) {
            console.error('Error fetching live ops:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && flights.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Connecting to Global Ops Network...</p>
        </div>
    );

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 h-[calc(100vh-120px)] flex flex-col">
            {/* Header / Stats Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-gold rounded-2xl flex items-center justify-center animate-pulse">
                        <Activity className="text-dark-900 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Live Operations Center</h1>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            System Active // Real-time Synchronization
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                    <MiniStat label="Airborne" value={stats.airborne} icon={<Navigation className="text-blue-400" />} />
                    <MiniStat label="Dispatching" value={stats.preflight} icon={<Clock className="text-yellow-400" />} />
                    <MiniStat label="Network Traffic" value={stats.vatsim} icon={<Wifi className="text-emerald-400" />} />
                    <MiniStat label="Network Avg" value="99.9%" icon={<Signal className="text-purple-400" />} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden min-h-0">
                {/* Left: Global Flight Board */}
                <div className="lg:col-span-1 glass-card flex flex-col min-h-0">
                    <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Globe className="w-3 h-3 text-accent-gold" /> Global Flight Board
                        </h2>
                        <span className="text-[10px] font-mono text-gray-600">{flights.length} Active</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {flights.filter(f => f.network === 'LEVANT').map((f) => ( // Only show Levant flights in list
                            <div key={f._id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/5 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-black text-white group-hover:text-accent-gold transition-colors">{f.callsign}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">{f.pilot_name}</p>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                        f.status === 'Airborne' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {f.status}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-white">{f.departure_icao}</p>
                                        <p className="text-[8px] text-gray-600 uppercase">DEP</p>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center gap-0.5 opacity-30">
                                        <div className="w-full h-[1px] bg-white/10 relative">
                                            <Plane className="w-2 h-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-white">{f.arrival_icao}</p>
                                        <p className="text-[8px] text-gray-600 uppercase">ARR</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500 uppercase">
                                        <Navigation size={10} className="text-blue-500" /> {Math.round(f.altitude)} ft
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500 uppercase">
                                        <Zap size={10} className="text-accent-gold" /> {Math.round(f.ground_speed)} kt
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500 uppercase">
                                        <Plane size={10} className="text-emerald-500" /> {Math.round(f.ias || 0)} ias
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-500 uppercase">
                                        <Activity size={10} className="text-purple-500" /> {f.phase || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {flights.filter(f => f.network === 'LEVANT').length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-12">
                                <Plane size={32} className="mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">No active flights</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Operations Map */}
                <div className="lg:col-span-3 glass-card relative overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/[0.06] bg-[#080808]/50 relative z-20 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <MapIcon className="w-3 h-3 text-blue-400" /> Live Map
                        </h2>
                        <div className="flex items-center gap-4">
                            {/* Network Toggles */}
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/[0.08]">
                                <button 
                                    onClick={() => setNetworkFilter('off')}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        networkFilter === 'off' ? 'bg-accent-gold text-black shadow-lg' : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    LEVANT Only
                                </button>
                                <button 
                                    onClick={() => setNetworkFilter('vatsim')}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        networkFilter === 'vatsim' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    VATSIM
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 relative z-10">
                         <DashboardMap flights={flights} />
                    </div>

                    {/* Overlay: Fleet Health / ATC Status (Floating) */}
                    <div className="absolute bottom-6 left-6 z-20 space-y-3 pointer-events-none">
                        <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] max-w-[200px] backdrop-blur-2xl">
                             <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Main Hubs Status</p>
                             <div className="space-y-2">
                                 <HubStatus icao="OJAI" status="Active" pilots={flights.filter(f => f.departure_icao === 'OJAI').length} />
                                 <HubStatus icao="OSDI" status="Active" pilots={flights.filter(f => f.departure_icao === 'OSDI').length} />
                                 <HubStatus icao="ORBI" status="Active" pilots={flights.filter(f => f.departure_icao === 'ORBI').length} />
                             </div>
                        </div>
                    </div>

                    {/* Overlay: Delays & Flight Wings (Right side) */}
                    <div className="absolute bottom-6 right-6 z-20 space-y-3 pointer-events-none max-w-[240px]">
                        {delays.length > 0 && (
                            <div className="glass-panel p-4 rounded-2xl border border-orange-500/20 backdrop-blur-2xl pointer-events-auto">
                                <p className="text-[10px] font-black text-orange-400 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                    <AlertTriangle size={10} /> Current Delays
                                </p>
                                <div className="space-y-2">
                                    {delays.slice(0, 4).map((d: any, i: number) => (
                                        <div key={i} className="text-[10px]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-white">{d.callsign}</span>
                                                <span className="text-gray-600">·</span>
                                                <span className="text-gray-500">{d.departure_icao}→{d.arrival_icao}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {d.reasons.map((r: string, j: number) => (
                                                    <span key={j} className="text-[8px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded px-1.5 py-0.5">{r}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {wings.length > 0 && (
                            <div className="glass-panel p-4 rounded-2xl border border-blue-500/20 backdrop-blur-2xl pointer-events-auto">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                                    <Users size={10} /> Flight Wings
                                </p>
                                <div className="space-y-2">
                                    {wings.slice(0, 3).map((w: any, i: number) => (
                                        <div key={i} className="text-[10px]">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-white">{w.route}</span>
                                                <span className="text-blue-400 font-bold">{w.count} pilots</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {w.pilots.map((p: any, j: number) => (
                                                    <span key={j} className="text-[8px] bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded px-1.5 py-0.5">{p.callsign}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon }: any) {
    return (
        <div className="glass-panel px-4 py-3 rounded-xl border border-white/[0.06] flex items-center gap-3 min-w-[140px]">
            <div className="shrink-0">{icon}</div>
            <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-display font-black text-white leading-none">{value}</p>
            </div>
        </div>
    );
}

function HubStatus({ icao, status, pilots }: any) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-mono text-white font-bold">{icao}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-mono text-gray-400">
                 {pilots} <Users size={8} />
            </div>
            <span className={`text-[8px] font-black uppercase ${status === 'Active' ? 'text-emerald-400' : 'text-gray-600'}`}>
                {status}
            </span>
        </div>
    );
}
