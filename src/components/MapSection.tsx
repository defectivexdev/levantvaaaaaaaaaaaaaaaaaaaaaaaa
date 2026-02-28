'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFlightSocket } from '@/hooks/useFlightSocket';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { BorderBeam } from '@/components/ui/border-beam';
import type { MapFlight } from './Map';

const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-[#0B0E11]">
            <div className="text-gray-600 text-xs uppercase tracking-widest animate-pulse">Loading map...</div>
        </div>
    ),
});

export default function MapSection() {
    const [flights, setFlights] = useState<MapFlight[]>([]);
    const [count, setCount] = useState(0);

    // Real-time Pusher — merge incoming flight updates instantly
    useFlightSocket(useCallback((data: any) => {
        if (!data?.callsign) return;
        setFlights(prev => {
            const exists = prev.some(f => f.callsign === data.callsign);
            if (exists) {
                return prev.map(f =>
                    f.callsign === data.callsign
                        ? { ...f, latitude: data.latitude, longitude: data.longitude, altitude: data.altitude, heading: data.heading, ground_speed: data.groundSpeed ?? data.groundspeed ?? f.ground_speed, groundspeed: data.groundSpeed ?? data.groundspeed ?? f.groundspeed, status: data.status, phase: data.phase ?? f.phase, ias: data.ias ?? f.ias, verticalSpeed: data.verticalSpeed ?? f.verticalSpeed, departure: data.departure ?? f.departure, arrival: data.arrival ?? f.arrival, equipment: data.equipment ?? f.equipment, comfort_score: data.comfort_score ?? f.comfort_score, fuel: data.fuel ?? f.fuel }
                        : f
                );
            }
            // New flight — add it
            return [...prev, data];
        });
    }, []));

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        const fetchFlights = async () => {
            if (document.hidden) return;

            try {
                // Try the ACARS traffic API first, fallback to live-map
                let flights: any[] = [];

                const trafficRes = await fetch('/api/acars?action=traffic');
                if (trafficRes.ok) {
                    const tData = await trafficRes.json();
                    if (tData.traffic && Array.isArray(tData.traffic) && tData.traffic.length > 0) {
                        // Normalize field names for Map component
                        flights = tData.traffic.map((f: any) => ({
                            callsign: f.callsign,
                            pilot: f.pilotName || f.pilot_name || '',
                            departure: f.departureIcao || f.departure_icao || '',
                            arrival: f.arrivalIcao || f.arrival_icao || '',
                            equipment: f.aircraftType || f.aircraft_type || '',
                            latitude: f.latitude,
                            longitude: f.longitude,
                            altitude: f.altitude,
                            heading: f.heading,
                            groundspeed: f.groundSpeed || f.ground_speed || 0,
                            ias: f.ias || 0,
                            verticalSpeed: f.verticalSpeed || f.vertical_speed || 0,
                            phase: f.phase || f.status || '',
                            status: f.phase || f.status || '',
                            fuel: f.fuel || 0,
                            comfort_score: f.comfortScore || f.comfort_score || 100,
                            started_at: f.startedAt || f.started_at || '',
                        }));
                    }
                }

                // Fallback to live-map endpoint
                if (flights.length === 0) {
                    const lmRes = await fetch('/api/acars/live-map');
                    if (lmRes.ok) {
                        const data = await lmRes.json();
                        if (Array.isArray(data)) flights = data;
                        else if (data.flights && Array.isArray(data.flights)) flights = data.flights;
                    }
                }

                setFlights(flights);
                setCount(flights.length);
            } catch (error) {
                console.error('Error fetching flights:', error);
            }
        };

        fetchFlights();
        interval = setInterval(fetchFlights, 30000); // 30s polling

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(interval);
            } else {
                fetchFlights();
                interval = setInterval(fetchFlights, 30000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return (
        <section id="map" className="py-24 px-4 relative overflow-hidden">
             {/* Background Glow */}
             <div className="absolute bottom-0 left-0 w-1/2 h-full bg-primary-500/5 blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Live <span className="text-accent-gold">Flight</span> Ops
                    </h2>
                    <div className="divider" />
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        Track our pilots in real-time as they explore the skies of the Middle East and beyond.
                    </p>
                    {count > 0 && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/[0.08]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm text-gray-300 font-mono">{count} active flight{count !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </motion.div>

                {/* Map Container */}
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="glass-card overflow-hidden h-[650px] relative w-full border border-white/[0.06] shadow-2xl rounded-2xl"
                >
                    <BorderBeam 
                        size={300} 
                        duration={20} 
                        colorFrom="#d4af37" 
                        colorTo="#cd7f32" 
                    />
                    <Map flights={flights} />
                </motion.div>
            </div>
        </section>
    );
}
