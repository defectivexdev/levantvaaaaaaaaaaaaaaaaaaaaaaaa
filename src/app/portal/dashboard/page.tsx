'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Clock, CreditCard, Plane, Award, Users, ChevronRight, Medal, TrendingUp, Activity, Zap, Star } from 'lucide-react';
import Link from 'next/link';
import RankBadge from '@/components/RankBadge';
import AwardCelebration from '@/components/AwardCelebration';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardMap = dynamic<any>(() => import('@/components/DashboardMap'), { 
    loading: () => <div className="h-96 flex items-center justify-center text-gray-600 text-sm">Loading Map...</div>,
    ssr: false 
});

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
};

const statusColors: Record<string, string> = {
    'Preflight': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Taxi': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Cruise': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Descent': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Landing': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    'En Route': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'Climbing': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Approach': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const ITEMS_PER_PAGE = 5;
const FLIGHT_POLL_MS = 8000;
const DATA_POLL_MS = 60000;

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        stats: [] as any[],
        newestPilots: [] as any[],
        recentReports: [] as any[],
        activeFlights: [] as any[],
        dotm: null as any,
    });
    const [metars, setMetars] = useState<Array<{icao: string; metar: string; error: boolean}>>([]);
    const [currentFlightPage, setCurrentFlightPage] = useState(0);
    const [currentReportPage, setCurrentReportPage] = useState(0);

    const totalFlightPages = useMemo(() => Math.ceil(dashboardData.activeFlights.length / ITEMS_PER_PAGE), [dashboardData.activeFlights.length]);
    const totalReportPages = useMemo(() => Math.ceil(dashboardData.recentReports.length / ITEMS_PER_PAGE), [dashboardData.recentReports.length]);

    const fetchDashboard = useCallback(async () => {
        const safeFetch = async (url: string) => {
            try { const r = await fetch(url); return await r.json(); } catch { return null; }
        };

        const [statsData, pilotsData, reportsData] = await Promise.all([
            safeFetch('/api/portal/stats'),
            safeFetch('/api/portal/new-pilots'),
            safeFetch('/api/portal/reports/recent'),
        ]);

        setDashboardData(prev => ({
            ...prev,
            stats: statsData?.stats || [],
            newestPilots: pilotsData?.pilots || [],
            recentReports: reportsData?.reports || [],
            dotm: statsData?.dotm || null,
        }));
        setLoading(false);
    }, []);

    const fetchFlights = useCallback(async () => {
        try {
            const res = await fetch('/api/portal/active-flights');
            const data = await res.json();
            setDashboardData(prev => ({ ...prev, activeFlights: data.flights || [] }));
        } catch {}
    }, []);

    const fetchMetars = useCallback(async () => {
        try {
            const res = await fetch('/api/weather/metar');
            const data = await res.json();
            setMetars(data.metars || []);
        } catch {}
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchDashboard();
        fetchMetars();
        const interval = setInterval(fetchDashboard, DATA_POLL_MS);
        const metarInterval = setInterval(fetchMetars, 300000); // Refresh every 5 minutes
        return () => {
            clearInterval(interval);
            clearInterval(metarInterval);
        };
    }, [fetchDashboard, fetchMetars]);

    useEffect(() => {
        fetchFlights();
        const interval = setInterval(fetchFlights, FLIGHT_POLL_MS);
        return () => clearInterval(interval);
    }, [fetchFlights]);

    useEffect(() => {
        if (totalFlightPages <= 1) return;
        const interval = setInterval(() => setCurrentFlightPage(p => (p + 1) % totalFlightPages), 30000);
        return () => clearInterval(interval);
    }, [totalFlightPages]);

    useEffect(() => {
        if (totalReportPages <= 1) return;
        const interval = setInterval(() => setCurrentReportPage(p => (p + 1) % totalReportPages), 30000);
        return () => clearInterval(interval);
    }, [totalReportPages]);

    if (!mounted) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-[#0a0a0a] rounded-2xl border border-white/[0.04]" />
                    ))}
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-[#0a0a0a] rounded-2xl border border-white/[0.04]" />
                    <div className="h-96 bg-[#0a0a0a] rounded-2xl border border-white/[0.04]" />
                </div>
            </div>
        );
    }

    return (
        <>
        <AwardCelebration />
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 pb-8"
        >
            {/* Welcome Banner */}
            <motion.div 
                variants={itemVariants}
                className="relative bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent rounded-2xl border border-amber-500/20 p-6 overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">Welcome back, Pilot!</h1>
                        <p className="text-sm text-gray-400">Ready for your next flight?</p>
                    </div>
                    <div className="hidden md:block">
                        <Plane className="w-16 h-16 text-amber-500/30" />
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardData.stats.length > 0 ? (
                    dashboardData.stats.map((stat: any, i: number) => {
                        const iconMap: Record<string, any> = {
                            location: MapPin,
                            clock: Clock,
                            credits: CreditCard,
                            plane: Plane,
                        };
                        const Icon = iconMap[stat.icon] || Activity;
                        
                        const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
                            blue: { bg: 'from-blue-500/10 to-blue-600/5', text: 'text-blue-400', icon: 'text-blue-500' },
                            emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', text: 'text-emerald-400', icon: 'text-emerald-500' },
                            gold: { bg: 'from-amber-500/10 to-amber-600/5', text: 'text-amber-400', icon: 'text-amber-500' },
                            purple: { bg: 'from-purple-500/10 to-purple-600/5', text: 'text-purple-400', icon: 'text-purple-500' },
                        };
                        const colors = colorMap[stat.color] || colorMap.blue;

                        return (
                            <motion.div 
                                key={stat.label}
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className={`relative bg-gradient-to-br ${colors.bg} rounded-2xl p-5 border border-white/[0.04] hover:border-white/[0.08] transition-all group overflow-hidden cursor-pointer`}
                            >
                                <div className="absolute -bottom-2 -right-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                    <Icon className="w-24 h-24" />
                                </div>
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{stat.label}</span>
                                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                            <Icon className={`w-4 h-4 ${colors.icon}`} />
                                        </div>
                                    </div>
                                    <div className={`text-3xl font-bold ${colors.text} mb-1`}>{stat.value}</div>
                                    {stat.subtext && (
                                        <div className="text-xs text-gray-500">{stat.subtext}</div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[#0a0a0a] rounded-2xl p-5 border border-white/[0.04] animate-pulse">
                            <div className="h-3 w-16 bg-white/[0.06] rounded mb-3" />
                            <div className="h-8 w-24 bg-white/[0.06] rounded" />
                        </div>
                    ))
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Map & Recent Reports */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Flights Map */}
                    <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Live Flights</h2>
                                    <p className="text-xs text-gray-500">{dashboardData.activeFlights.length} pilots in the sky</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-96">
                            <DashboardMap flights={dashboardData.activeFlights} />
                        </div>
                    </motion.div>

                    {/* Live Flight Status */}
                    <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Plane className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Live Flight Status</h2>
                                    <p className="text-xs text-gray-500">Active flights in progress</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                            {dashboardData.activeFlights.slice(0, 5).map((flight: any, i: number) => (
                                <motion.div
                                    key={flight._id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center flex-shrink-0">
                                                <Plane className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-white">{flight.pilot?.first_name} {flight.pilot?.last_name}</span>
                                                    <span className="text-xs text-gray-600">•</span>
                                                    <span className="text-xs text-gray-500">{flight.pilot?.pilot_id}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-mono font-semibold text-emerald-500">{flight.departure_icao}</span>
                                                    <ChevronRight className="w-3 h-3 text-gray-600" />
                                                    <span className="font-mono font-semibold text-emerald-500">{flight.arrival_icao}</span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-gray-500">{flight.aircraft_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {flight.phase && (
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusColors[flight.phase] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                                    {flight.phase}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {dashboardData.activeFlights.length === 0 && (
                                <div className="p-12 text-center">
                                    <Plane className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No active flights</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent PIREPs */}
                    <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Recent PIREPs</h2>
                                    <p className="text-xs text-gray-500">Latest completed flights</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                            {dashboardData.recentReports.slice(currentReportPage * ITEMS_PER_PAGE, (currentReportPage + 1) * ITEMS_PER_PAGE).map((report: any, i: number) => (
                                <motion.div
                                    key={report._id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0">
                                                <Plane className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-white">{report.pilot?.first_name} {report.pilot?.last_name}</span>
                                                    <span className="text-xs text-gray-600">•</span>
                                                    <span className="text-xs text-gray-500">{report.pilot?.pilot_id}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-mono font-semibold text-amber-500">{report.departure_icao}</span>
                                                    <ChevronRight className="w-3 h-3 text-gray-600" />
                                                    <span className="font-mono font-semibold text-amber-500">{report.arrival_icao}</span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-gray-500">{report.aircraft_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {report.log?.landingAnalysis?.butterScore && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <Star className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-xs font-bold text-emerald-400">{report.log.landingAnalysis.butterScore.toFixed(1)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {dashboardData.recentReports.length === 0 && (
                                <div className="p-12 text-center">
                                    <Plane className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No recent PIREPs</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Pilot of the Month */}
                    {dashboardData.dotm && (
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-purple-500/20 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="w-5 h-5 text-purple-500" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pilot of the Month</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-purple-400">
                                        {dashboardData.dotm.first_name?.[0]}{dashboardData.dotm.last_name?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{dashboardData.dotm.first_name} {dashboardData.dotm.last_name}</div>
                                    <div className="text-xs text-gray-500">{dashboardData.dotm.pilot_id}</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Newest Pilots */}
                    <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Newest Pilots</h2>
                                <p className="text-xs text-gray-500">Recently joined</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            {dashboardData.newestPilots.slice(0, 5).map((pilot: any, i: number) => (
                                <motion.div
                                    key={pilot._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-amber-500">
                                            {pilot.first_name?.[0]}{pilot.last_name?.[0]}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-white truncate">{pilot.first_name} {pilot.last_name}</div>
                                        <div className="text-xs text-gray-500">{pilot.pilot_id}</div>
                                    </div>
                                </motion.div>
                            ))}
                            {dashboardData.newestPilots.length === 0 && (
                                <div className="text-center py-8">
                                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs">No new pilots</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Airport METAR Widget */}
                    <motion.div variants={itemVariants} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.04] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-cyan-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Airport Weather</h2>
                                <p className="text-xs text-gray-500">Live METAR</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            {metars.map((metar, i) => (
                                <motion.div
                                    key={metar.icao}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-transparent border border-cyan-500/10"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-cyan-400">{metar.icao}</span>
                                        {!metar.error && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        )}
                                    </div>
                                    <p className={`text-xs font-mono leading-relaxed ${metar.error ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {metar.metar}
                                    </p>
                                </motion.div>
                            ))}
                            {metars.length === 0 && (
                                <div className="text-center py-8">
                                    <MapPin className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs">Loading weather data...</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
        </>
    );
}
