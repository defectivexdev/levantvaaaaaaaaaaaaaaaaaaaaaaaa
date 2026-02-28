'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export default function LiveGlobe() {
    const globeEl = useRef<any>(undefined);
    const [mounted, setMounted] = useState(false);
    const [flights, setFlights] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        
        const fetchFlights = async () => {
            try {
                const res = await fetch('/api/portal/active-flights', { cache: 'no-store' });
                const data = await res.json();
                if (data.activeFlights) {
                    const mapped = data.activeFlights.map((f: any) => ({
                         ...f,
                         lat: f.latitude,
                         lng: f.longitude,
                         alt: f.altitude / 300000, // Scale down altitude for globe (0.1 is atmosphere)
                         color: '#10b981',
                         label: `${f.callsign} (${f.pilot})`
                    }));
                    setFlights(mapped);
                }
            } catch (e) {
                console.error('Failed to load traffic', e);
            }
        };

        fetchFlights();
        const interval = setInterval(fetchFlights, 10000); // Poll every 10s

        // Auto-rotate
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
        }

        return () => clearInterval(interval);
    }, []);

    if (!mounted) return <div className="h-96 w-full flex items-center justify-center bg-transparent"><div className="animate-spin text-primary-500">Loading Globe...</div></div>;

    return (
        <div className="w-full h-[600px] relative overflow-hidden rounded-3xl bg-[#050505] border border-white/[0.06] shadow-2xl">
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <h3 className="text-2xl font-display font-bold text-white text-glow">Live Operations</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase">{flights.length} FLIGHTS ACTIVE</p>
                </div>
            </div>

            <Globe
                ref={globeEl}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundColor="rgba(0,0,0,0)"
                atmosphereColor="#3b82f6"
                atmosphereAltitude={0.15}
                pointsData={flights}
                pointAltitude="alt"
                pointColor={() => "#10b981"}
                pointRadius={0.5}
                pointLabel="label"
                ringsData={flights}
                ringColor={() => (t: any) => `rgba(16,185,129,${1-t})`}
                ringMaxRadius={3}
                ringPropagationSpeed={2}
                ringRepeatPeriod={800}
                // Optional: Show Arcs for routes if we had Departure/Arrival Lat/Lng
                // For now, simpler is better to avoid clutter
            />
        </div>
    );
}
