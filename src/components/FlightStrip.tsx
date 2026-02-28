'use client';

import { useState } from 'react';
import { Plane, Clock, Fuel, Gauge, Zap, Download, Share2, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightStripProps {
    flightId: string;
    onClose?: () => void;
}

interface StripData {
    flight_number: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    route: string;
    aircraft_type: string;
    landing_rate: number;
    landing_grade: { label: string; color: string; emoji: string };
    score: number;
    max_g_force: number;
    flight_time: string;
    flight_time_minutes: number;
    distance: number;
    fuel_used: number;
    pilot_name: string;
    pilot_id: string;
    pilot_rank: string;
    date: string;
    credits_earned: number;
}

export default function FlightStrip({ flightId, onClose }: FlightStripProps) {
    const [strip, setStrip] = useState<StripData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useState(() => {
        (async () => {
            try {
                const res = await fetch(`/api/flights/flight-strip/${flightId}`);
                const data = await res.json();
                if (data.success) setStrip(data.strip);
                else setError(data.error || 'Failed to load');
            } catch { setError('Network error'); }
            setLoading(false);
        })();
    });

    if (loading) {
        return (
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !strip) {
        return (
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 text-center text-gray-500 text-sm">
                {error || 'Flight strip unavailable'}
            </div>
        );
    }

    const gradeColors: Record<string, string> = {
        BUTTER: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30',
        SMOOTH: 'from-green-500/20 to-green-900/10 border-green-500/30',
        ACCEPTABLE: 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/30',
        FIRM: 'from-orange-500/20 to-orange-900/10 border-orange-500/30',
        HARD: 'from-red-500/20 to-red-900/10 border-red-500/30',
    };

    const bgClass = gradeColors[strip.landing_grade.label] || gradeColors.ACCEPTABLE;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            id="flight-strip-card"
            className={`relative bg-gradient-to-br ${bgClass} border rounded-2xl overflow-hidden`}
        >
            {onClose && (
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white z-10 transition-colors">
                    <X size={16} />
                </button>
            )}

            {/* Top bar */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent-gold/20 rounded-lg flex items-center justify-center">
                        <Plane size={16} className="text-accent-gold" />
                    </div>
                    <div>
                        <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Levant Virtual Airlines</div>
                        <div className="text-white font-bold text-sm">{strip.callsign}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-gray-500">{new Date(strip.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-gray-400 font-mono">{strip.pilot_id}</div>
                </div>
            </div>

            {/* Route */}
            <div className="px-6 py-4 flex items-center gap-4">
                <div className="text-center">
                    <div className="text-2xl font-black text-white tracking-wider">{strip.departure_icao}</div>
                    <div className="text-[9px] text-gray-500">DEP</div>
                </div>
                <div className="flex-1 relative">
                    <div className="h-px bg-gradient-to-r from-white/20 via-white/40 to-white/20" />
                    <Plane size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-gold rotate-90" />
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-white tracking-wider">{strip.arrival_icao}</div>
                    <div className="text-[9px] text-gray-500">ARR</div>
                </div>
            </div>

            {/* Landing Grade */}
            <div className="px-6 pb-3 flex items-center justify-center gap-3">
                <span className="text-3xl">{strip.landing_grade.emoji}</span>
                <div>
                    <div className="font-black text-lg tracking-wider" style={{ color: strip.landing_grade.color }}>
                        {strip.landing_grade.label}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{strip.landing_rate} fpm</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 pb-5 grid grid-cols-4 gap-3">
                {[
                    { icon: Clock, label: 'Duration', value: strip.flight_time, color: 'text-blue-400' },
                    { icon: Gauge, label: 'Score', value: `${strip.score}/100`, color: 'text-emerald-400' },
                    { icon: Fuel, label: 'Fuel', value: `${Math.round(strip.fuel_used)} lbs`, color: 'text-orange-400' },
                    { icon: Zap, label: 'G-Force', value: `${strip.max_g_force.toFixed(1)}G`, color: 'text-purple-400' },
                ].map((s, i) => (
                    <div key={i} className="bg-black/20 rounded-xl p-2.5 text-center">
                        <s.icon size={12} className={`${s.color} mx-auto mb-1`} />
                        <div className="text-white text-xs font-bold">{s.value}</div>
                        <div className="text-[8px] text-gray-600">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between bg-black/20">
                <div className="text-[10px] text-gray-500">
                    <span className="text-gray-400 font-bold">{strip.pilot_name}</span> · {strip.pilot_rank} · {strip.aircraft_type} · {strip.distance}nm
                </div>
                <div className="text-accent-gold font-bold text-xs">+{strip.credits_earned} Cr</div>
            </div>
        </motion.div>
    );
}
