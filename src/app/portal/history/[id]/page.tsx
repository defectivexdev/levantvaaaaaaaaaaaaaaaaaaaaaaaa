'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Plane, MapPin, Clock, Navigation, AlertTriangle, TrendingDown, TrendingUp, CheckCircle, XCircle, Zap, Share2 } from 'lucide-react';
import FlightStrip from '@/components/FlightStrip';
import dynamic from 'next/dynamic';
const PirepChart = dynamic(() => import('@/components/charts/PirepChart'), { ssr: false });

export default function FlightDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [flight, setFlight] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showStrip, setShowStrip] = useState(false);

    useEffect(() => {
        const fetchFlight = async () => {
            try {
                const res = await fetch(`/api/portal/history/${id}`);
                const data = await res.json();
                
                if (data.flight) {
                    setFlight(data.flight);
                } else {
                    setError('Flight not found');
                }
            } catch (err) {
                setError('Failed to load flight details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchFlight();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 border-2 border-amber-500/20 rounded-full animate-pulse" />
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Loading Flight Log...</p>
            </div>
        );
    }

    if (error || !flight) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertTriangle className="w-12 h-12 text-rose-500 opacity-50" />
                <h3 className="text-xl font-bold text-white">Flight Not Found</h3>
                <p className="text-gray-500">{error || "This flight record doesn't exist or you don't have permission to view it."}</p>
                <button 
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-all mt-4"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-fade-in text-white/90">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        Flight {flight.flight_number}
                        {flight.approved_status === 1 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        {flight.approved_status === 2 && <XCircle className="w-5 h-5 text-rose-500" />}
                        {flight.approved_status === 0 && <Clock className="w-5 h-5 text-amber-500" />}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500 font-mono">
                        <span>{new Date(flight.submitted_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(flight.submitted_at).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl p-6 border border-white/[0.06] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Navigation size={100} />
                    </div>
                    <div className="flex items-center justify-between relative z-10 h-full">
                        <div className="text-center">
                            <span className="text-4xl font-black font-display text-white block">{flight.departure_icao}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Origin</span>
                        </div>
                        <div className="flex-1 px-8 flex flex-col items-center">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
                                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 rotate-90 bg-[#111] p-0.5 rounded-full" />
                            </div>
                            <span className="text-xs font-mono text-amber-500 mt-2">{formatDuration(flight.flight_time)}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-4xl font-black font-display text-white block">{flight.arrival_icao}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Destination</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-center">
                    <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Aircraft</span>
                    <span className="text-2xl font-bold text-white">{flight.aircraft_type}</span>
                    <span className="text-xs text-gray-600 font-mono mt-1">N/A Reg</span>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-center">
                    <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Landing Rate</span>
                    <div className={`text-2xl font-bold font-mono ${flight.landing_rate < -500 ? 'text-rose-500' : 'text-emerald-400'} flex items-center gap-2`}>
                        {flight.landing_rate} <span className="text-sm text-gray-500 font-normal">fpm</span>
                    </div>
                    <span className="text-xs text-gray-600 mt-1">
                        {flight.landing_rate > -200 ? 'Perfect Landing' : flight.landing_rate > -500 ? 'Acceptable' : 'Hard Landing'}
                    </span>
                </div>
            </div>

            {/* Credits Breakdown */}
            {flight.credits_earned > 0 && (
                <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-900/5 rounded-2xl p-6 border border-emerald-500/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Zap size={16} className="text-emerald-400" /> Credits Earned
                        </h2>
                        <span className="text-2xl font-black text-emerald-400">+{flight.credits_earned} CR</span>
                    </div>
                    {flight.credits_breakdown && flight.credits_breakdown.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {flight.credits_breakdown.filter((line: string) => line !== '---').map((line: string, i: number) => {
                                const isPositive = line.includes('+');
                                const isNegative = line.includes('-') && !line.includes('---');
                                const isTotal = line.toLowerCase().startsWith('total');
                                const isMult = line.toLowerCase().startsWith('multiplier');
                                return (
                                    <div key={i} className={`text-xs font-mono px-3 py-1.5 rounded-lg ${
                                        isTotal ? 'bg-emerald-500/10 text-emerald-300 font-bold md:col-span-2' :
                                        isMult ? 'bg-purple-500/10 text-purple-300 md:col-span-2' :
                                        isPositive ? 'text-emerald-400 bg-emerald-500/5' :
                                        isNegative ? 'text-rose-400 bg-rose-500/5' :
                                        'text-gray-400 bg-white/[0.02]'
                                    }`}>
                                        {line}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Flight Strip Toggle */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowStrip(!showStrip)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 transition-all"
                >
                    <Share2 size={14} /> {showStrip ? 'Hide' : 'Show'} Flight Strip
                </button>
            </div>
            {showStrip && <FlightStrip flightId={id} onClose={() => setShowStrip(false)} />}

            {/* Flight Profile Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                Flight Profile
                            </h2>
                            <p className="text-xs text-gray-500">Altitude, Speed & Vertical Speed Telemetry</p>
                        </div>
                    </div>
                    
                    <PirepChart data={flight.telemetry || []} />
                </div>

                {/* Score & Events */}
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-6 shadow-xl flex flex-col">
                     <div className="mb-6 text-center">
                         <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-amber-500/20 bg-amber-500/5 mb-3 relative">
                             <span className="text-4xl font-black text-white">{flight.score}</span>
                             <div className="absolute inset-0 rounded-full border-t-4 border-amber-500 rotate-45 opacity-50"></div>
                         </div>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Flight Score</p>
                     </div>

                     <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                         <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 sticky top-0 bg-[#0a0a0a] py-2">Deductions & Events</h3>
                         
                         {flight.log?.deductions && flight.log.deductions.length > 0 ? (
                             flight.log.deductions.map((d: any, i: number) => (
                                 <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                     <TrendingDown className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                     <div>
                                         <p className="text-sm text-rose-200 font-medium">{d.message}</p>
                                         <p className="text-xs text-rose-500/50 font-mono mt-0.5">-{d.points} pts</p>
                                     </div>
                                 </div>
                             ))
                         ) : (
                             <div className="text-center py-8 text-gray-600 italic text-sm">
                                 No deductions recorded. Perfect flight!
                             </div>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
}
