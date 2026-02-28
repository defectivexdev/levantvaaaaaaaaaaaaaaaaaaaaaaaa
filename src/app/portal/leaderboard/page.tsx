'use client';

import { useState, useEffect, Suspense } from 'react';
import { Trophy, Star, Users, Loader2, Award, Clock, Plane, TrendingUp, Medal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import RankBadge from '@/components/RankBadge';

interface LeaderboardPilot {
    rank: number;
    pilotId: string;
    name: string;
    hours: number;
    flights: number;
    credits?: number;
    pilotRank: string;
    avatarUrl?: string;
    isLanding?: boolean;
    isCredits?: boolean;
}

const ranks = [
    { name: 'Cadet', hours: 0, flights: 0, image: '/img/ranks/cadet.png', color: 'text-gray-400', bg: 'from-gray-500/10' },
    { name: 'Second Officer', hours: 50, flights: 10, image: '/img/ranks/secondofficer.png', color: 'text-blue-400', bg: 'from-blue-500/10' },
    { name: 'First Officer', hours: 150, flights: 30, image: '/img/ranks/firstofficer.png', color: 'text-green-400', bg: 'from-green-500/10' },
    { name: 'Senior First Officer', hours: 300, flights: 60, image: '/img/ranks/seniorcaptain.png', color: 'text-purple-400', bg: 'from-purple-500/10' },
    { name: 'Captain', hours: 500, flights: 100, image: '/img/ranks/captain.png', color: 'text-accent-gold', bg: 'from-amber-500/10' },
];

const FILTERS = [
    { key: 'all-time', label: 'All-Time', icon: Trophy },
    { key: 'monthly', label: 'This Month', icon: TrendingUp },
    { key: 'credits', label: 'Top Credits', icon: Zap },
    { key: 'landing', label: 'Best Landings', icon: Plane },
] as const;

function LeaderboardContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams?.get('tab');
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'ranks'>('leaderboard');
    const [filter, setFilter] = useState<'all-time' | 'monthly' | 'credits' | 'landing'>(
        tabParam === 'landing' ? 'landing' : tabParam === 'credits' ? 'credits' : 'all-time'
    );
    const [leaderboard, setLeaderboard] = useState<LeaderboardPilot[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            setLoading(true);
            fetch(`/api/leaderboard?type=${filter}`)
                .then(res => res.json())
                .then(data => setLeaderboard(data.pilots || []))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [activeTab, filter]);

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-accent-gold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Pilot Rankings</h1>
                        <p className="text-gray-500 text-xs">Top performers & career progression</p>
                    </div>
                </div>

                <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-white/[0.06]">
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === 'leaderboard' ? 'bg-accent-gold text-black' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        Leaderboard
                    </button>
                    <button
                        onClick={() => setActiveTab('ranks')}
                        className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            activeTab === 'ranks' ? 'bg-accent-gold text-black' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        Ranks
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'leaderboard' && (
                    <motion.div key="lb" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* Filter Pills */}
                        <div className="flex gap-2">
                            {FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                        filter === f.key 
                                            ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold' 
                                            : 'bg-transparent border-white/[0.06] text-gray-500 hover:text-white hover:border-white/10'
                                    }`}
                                >
                                    <f.icon className="w-3.5 h-3.5" />
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <Loader2 className="w-8 h-8 animate-spin text-accent-gold mb-4" />
                                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Loading rankings...</p>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center py-24 bg-[#0a0a0a] border border-white/[0.06] rounded-2xl">
                                <Users className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                                <p className="text-gray-500">No pilots on the leaderboard yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* Podium - Top 3 */}
                                {top3.length >= 3 && (
                                    <div className="grid grid-cols-3 gap-4 items-end">
                                        {/* 2nd Place */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                            className="bg-[#0a0a0a] border border-gray-500/20 rounded-2xl p-5 text-center relative overflow-hidden group hover:border-gray-400/30 transition-all"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-500/5 to-transparent" />
                                            <div className="relative">
                                                <div className="text-3xl mb-3">🥈</div>
                                                <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-[#0a0a0a] border-2 border-gray-500/30 overflow-hidden">
                                                    {top3[1].avatarUrl ? (
                                                        <img src={top3[1].avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : null}
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm bg-[#0a0a0a]">
                                                        {top3[1].name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                </div>
                                                <p className="text-white font-bold text-sm truncate">{top3[1].name}</p>
                                                <p className="text-gray-500 font-mono text-[10px] mt-0.5">{top3[1].pilotId}</p>
                                                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                                    <p className="text-gray-300 font-bold font-mono text-lg">
                                                        {top3[1].isCredits ? `${(top3[1].credits || 0).toLocaleString()} CR` : top3[1].isLanding ? `${top3[1].hours.toFixed(0)} fpm` : `${top3[1].hours.toFixed(1)}h`}
                                                    </p>
                                                    <p className="text-gray-600 text-[9px] uppercase tracking-widest">{top3[1].flights} flights</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* 1st Place */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                                            className="bg-[#0a0a0a] border border-yellow-500/30 rounded-2xl p-6 text-center relative overflow-hidden group hover:border-yellow-400/40 transition-all shadow-[0_0_40px_rgba(234,179,8,0.05)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent" />
                                            <div className="relative">
                                                <div className="text-4xl mb-3">🥇</div>
                                                <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-[#0a0a0a] border-2 border-yellow-500/40 overflow-hidden ring-4 ring-yellow-500/10">
                                                    {top3[0].avatarUrl ? (
                                                        <img src={top3[0].avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : null}
                                                    <div className="w-full h-full flex items-center justify-center text-accent-gold font-bold bg-[#0a0a0a]">
                                                        {top3[0].name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                </div>
                                                <p className="text-white font-bold truncate">{top3[0].name}</p>
                                                <p className="text-accent-gold font-mono text-[10px] mt-0.5">{top3[0].pilotId}</p>
                                                <RankBadge rank={top3[0].pilotRank} size="sm" showText />
                                                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                                    <p className="text-accent-gold font-bold font-mono text-2xl">
                                                        {top3[0].isCredits ? `${(top3[0].credits || 0).toLocaleString()} CR` : top3[0].isLanding ? `${top3[0].hours.toFixed(0)} fpm` : `${top3[0].hours.toFixed(1)}h`}
                                                    </p>
                                                    <p className="text-gray-600 text-[9px] uppercase tracking-widest">{top3[0].flights} flights</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* 3rd Place */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                            className="bg-[#0a0a0a] border border-orange-500/20 rounded-2xl p-5 text-center relative overflow-hidden group hover:border-orange-400/30 transition-all"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent" />
                                            <div className="relative">
                                                <div className="text-3xl mb-3">🥉</div>
                                                <div className="w-14 h-14 rounded-full mx-auto mb-3 bg-[#0a0a0a] border-2 border-orange-500/30 overflow-hidden">
                                                    {top3[2].avatarUrl ? (
                                                        <img src={top3[2].avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : null}
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm bg-[#0a0a0a]">
                                                        {top3[2].name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                </div>
                                                <p className="text-white font-bold text-sm truncate">{top3[2].name}</p>
                                                <p className="text-gray-500 font-mono text-[10px] mt-0.5">{top3[2].pilotId}</p>
                                                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                                    <p className="text-orange-300 font-bold font-mono text-lg">
                                                        {top3[2].isCredits ? `${(top3[2].credits || 0).toLocaleString()} CR` : top3[2].isLanding ? `${top3[2].hours.toFixed(0)} fpm` : `${top3[2].hours.toFixed(1)}h`}
                                                    </p>
                                                    <p className="text-gray-600 text-[9px] uppercase tracking-widest">{top3[2].flights} flights</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}

                                {/* Rest of leaderboard */}
                                {rest.length > 0 && (
                                    <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                                        {rest.map((pilot, i) => (
                                            <motion.div
                                                key={pilot.pilotId}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.05 * i }}
                                                className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <span className="text-gray-600 font-mono font-bold text-sm w-8 text-center">#{i + 4}</span>
                                                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/[0.06] overflow-hidden shrink-0">
                                                    {pilot.avatarUrl ? (
                                                        <img src={pilot.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : null}
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xs bg-[#0a0a0a]">
                                                        {pilot.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-semibold text-sm truncate">{pilot.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-accent-gold font-mono text-[10px]">{pilot.pilotId}</span>
                                                        <RankBadge rank={pilot.pilotRank} size="sm" />
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {pilot.isCredits ? (
                                                        <p className="text-emerald-400 font-bold font-mono">{(pilot.credits || 0).toLocaleString()} <span className="text-[10px] text-gray-500">CR</span></p>
                                                    ) : pilot.isLanding ? (
                                                        <p className="text-emerald-400 font-bold font-mono">{pilot.hours.toFixed(0)} <span className="text-[10px] text-gray-500">fpm</span></p>
                                                    ) : (
                                                        <p className="text-white font-bold font-mono">{pilot.hours.toFixed(1)} <span className="text-[10px] text-gray-500">hrs</span></p>
                                                    )}
                                                    <p className="text-gray-600 text-[10px] font-mono">{pilot.flights} flights</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {activeTab === 'ranks' && (
                    <motion.div key="ranks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                        {ranks.map((rank, index) => (
                            <motion.div
                                key={rank.name}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 * index }}
                                className={`bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-6 group hover:border-white/10 transition-all relative overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${rank.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className="relative flex items-center gap-6 w-full">
                                    <div className="w-8 text-center">
                                        <span className="text-gray-600 font-mono font-bold text-sm">{index + 1}</span>
                                    </div>
                                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/[0.06] group-hover:scale-105 transition-transform">
                                        <img src={rank.image} alt={rank.name} className="h-10 w-auto object-contain" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg ${rank.color}`}>{rank.name}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Clock className="w-3 h-3 text-gray-600" />
                                                <span className="font-mono font-semibold text-white">{rank.hours}+</span> hours
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Award className="w-3 h-3 text-gray-600" />
                                                <span className="font-mono font-semibold text-white">{rank.flights}+</span> flights
                                            </span>
                                        </div>
                                    </div>
                                    {index > 0 && (
                                        <div className="hidden md:block">
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full bg-gradient-to-r from-accent-gold/50 to-accent-gold`} style={{ width: `${(rank.hours / 500) * 100}%` }} />
                                            </div>
                                            <p className="text-[9px] text-gray-600 font-mono mt-1 text-right">{rank.hours}/500 hrs</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LeaderboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
            </div>
        }>
            <LeaderboardContent />
        </Suspense>
    );
}
