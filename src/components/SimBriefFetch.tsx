'use client';

import { useState, useEffect } from 'react';
import { Plane, RefreshCw, CheckCircle2, AlertCircle, MapPin, Fuel, Clock, ArrowRight } from 'lucide-react';

export default function SimBriefFetch() {
    const [sbId, setSbId] = useState('');
    const [loading, setLoading] = useState(false);
    const [ofp, setOfp] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Try to pre-fill from user settings or session
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    const id = data.user.simbriefId || data.user.pilotId?.replace(/\D/g, '') || '';
                    setSbId(id);
                }
            });
    }, []);

    const handleFetch = async () => {
        if (!sbId) return setError('Enter SimBrief Username/ID');
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/dispatch/simbrief/${sbId}`);
            const data = await res.json();
            if (data.fetch && data.fetch.status === 'Success') {
                setOfp(data);
            } else {
                setError('No active flight plan found.');
            }
        } catch (err) {
            setError('Failed to reach SimBrief.');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async () => {
        if (!ofp) return;
        setLoading(true);
        try {
            const res = await fetch('/api/flights/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callsign: ofp.atc.callsign,
                    departure_icao: ofp.origin.icao_code,
                    arrival_icao: ofp.destination.icao_code,
                    aircraft_type: ofp.aircraft.icao_code,
                    route: ofp.general.route,
                    estimated_flight_time: Math.round(Number(ofp.times.est_time_enroute) / 60),
                    pax: Number(ofp.weights.pax_count),
                    cargo: Number(ofp.weights.cargo) / 1000,
                    simbrief_ofp_id: ofp.params.request_id
                })
            });
            if (res.ok) {
                window.location.href = '/portal/dashboard'; // Refresh or show success
            }
        } catch (err) {
            setError('Booking failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">SimBrief Dispatch</h3>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {!ofp ? (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="SimBrief ID/User"
                            value={sbId}
                            onChange={(e) => setSbId(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                        />
                        <button 
                            onClick={handleFetch}
                            disabled={loading}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                            FETCH
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/[0.06]">
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">{ofp.origin.icao_code}</p>
                                <p className="text-[8px] text-gray-500 uppercase">{ofp.origin.icao_code}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 flex-1 px-4">
                                <div className="w-full h-[1px] bg-white/10 relative">
                                    <Plane className="w-3 h-3 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-[8px] text-gray-500 font-mono">{ofp.aircraft.icao_code}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">{ofp.destination.icao_code}</p>
                                <p className="text-[8px] text-gray-500 uppercase">{ofp.destination.icao_code}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2 rounded-lg border border-white/[0.06] flex items-center gap-2">
                                <Fuel size={12} className="text-blue-400" />
                                <span className="text-[10px] font-mono text-gray-300">{ofp.fuel.plan_ramp} lbs</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/[0.06] flex items-center gap-2">
                                <Clock size={12} className="text-blue-400" />
                                <span className="text-[10px] font-mono text-gray-300">{Math.floor(ofp.times.est_time_enroute/60)}m</span>
                            </div>
                        </div>

                        <div className="flex gap-2 text-[10px] text-gray-500 font-mono py-1 line-clamp-1 border-t border-white/[0.06] mt-2">
                            {ofp.general.route}
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setOfp(null)}
                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest transition-all"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleBook}
                                disabled={loading}
                                className="flex-[2] py-2 bg-accent-gold text-dark-900 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-accent-gold/20"
                            >
                                {loading ? 'FILING...' : 'DISPATCH FLIGHT'}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                        <AlertCircle size={12} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
