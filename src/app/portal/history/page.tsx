'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plane, Search, Filter, ChevronLeft, ChevronRight, X, BarChart3, Clock, Star, Zap, Download } from 'lucide-react';

interface FlightRecord {
    _id: string;
    flight_number: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    aircraft_type: string;
    flight_time: number;
    landing_rate: number;
    score: number;
    distance: number;
    submitted_at: string;
    approved_status: number;
    credits_earned?: number;
    credits_breakdown?: string[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const GRADES = [
    { key: '', label: 'All Grades' },
    { key: 'butter', label: 'Butter (< 60 fpm)', color: 'text-emerald-400' },
    { key: 'smooth', label: 'Smooth (60-150)', color: 'text-green-400' },
    { key: 'acceptable', label: 'Acceptable (150-300)', color: 'text-amber-400' },
    { key: 'firm', label: 'Firm (300-500)', color: 'text-orange-400' },
    { key: 'hard', label: 'Hard (> 500)', color: 'text-rose-500' },
];

function getLandingGrade(rate: number) {
    const abs = Math.abs(rate);
    if (abs <= 60) return { label: 'Butter', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (abs <= 150) return { label: 'Smooth', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    if (abs <= 300) return { label: 'Acceptable', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (abs <= 500) return { label: 'Firm', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Hard', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
}

export default function HistoryPage() {
    const [flights, setFlights] = useState<FlightRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filter state
    const [search, setSearch] = useState('');
    const [aircraft, setAircraft] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [grade, setGrade] = useState('');
    const [status, setStatus] = useState('');

    const hasFilters = search || aircraft || dateFrom || dateTo || grade || status;

    const fetchHistory = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '25');
            if (search) params.set('search', search);
            if (aircraft) params.set('aircraft', aircraft);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            if (grade) params.set('grade', grade);
            if (status) params.set('status', status);

            const res = await fetch(`/api/portal/history?${params}`);
            const data = await res.json();
            if (data.flights) setFlights(data.flights);
            if (data.pagination) setPagination(data.pagination);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    }, [search, aircraft, dateFrom, dateTo, grade, status]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchHistory(1), 300);
        return () => clearTimeout(timeout);
    }, [fetchHistory]);

    const clearFilters = () => {
        setSearch(''); setAircraft(''); setDateFrom(''); setDateTo(''); setGrade(''); setStatus('');
    };

    const getStatusBadge = (s: number) => {
        switch (s) {
            case 1: return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">APPROVED</span>;
            case 2: return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">REJECTED</span>;
            default: return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">PENDING</span>;
        }
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const inputCls = "w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none transition-colors placeholder:text-gray-600";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Flight Logbook</h1>
                    <p className="text-gray-500 text-xs">
                        {pagination.total} flight{pagination.total !== 1 ? 's' : ''} recorded
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/api/portal/history/export?format=csv"
                        download
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border bg-[#0a0a0a] text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                    >
                        <Download size={14} />
                        Export CSV
                    </a>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            showFilters || hasFilters ? 'bg-accent-gold text-black border-accent-gold' : 'bg-[#0a0a0a] text-gray-400 border-white/10 hover:border-white/20'
                        }`}
                    >
                        <Filter size={14} />
                        {hasFilters ? 'Filters Active' : 'Filters'}
                    </button>
                </div>
            </div>

            {/* Search Bar (always visible) */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by flight ID, callsign, ICAO code, or route..."
                    className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm focus:border-accent-gold/30 focus:outline-none transition-colors placeholder:text-gray-600"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Aircraft Type</label>
                                    <input type="text" value={aircraft} onChange={e => setAircraft(e.target.value)} placeholder="B738, A320..." className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">From Date</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">To Date</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Landing Grade</label>
                                    <select value={grade} onChange={e => setGrade(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                        {GRADES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex gap-2">
                                    {['', '0', '1', '2'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatus(s)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                                status === s ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {s === '' ? 'All' : s === '0' ? 'Pending' : s === '1' ? 'Approved' : 'Rejected'}
                                        </button>
                                    ))}
                                </div>
                                {hasFilters && (
                                    <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                                        <X size={12} /> Clear All
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Flight List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-16 text-gray-500">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <span className="text-xs font-mono uppercase tracking-widest">Searching records...</span>
                    </div>
                ) : flights.length === 0 ? (
                    <div className="text-center py-16 bg-[#0a0a0a] rounded-2xl border border-white/[0.06]">
                        <Plane className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-400">No Flights Found</h3>
                        <p className="text-gray-600 text-sm mt-1">
                            {hasFilters ? 'Try adjusting your search filters.' : 'Complete your first flight via ACARS to see it here.'}
                        </p>
                    </div>
                ) : (
                    flights.map((flight, i) => {
                        const landingGrade = getLandingGrade(flight.landing_rate);
                        return (
                            <motion.div
                                key={flight._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => window.location.href = `/portal/history/${flight._id}`}
                                className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 hover:border-accent-gold/20 transition-all cursor-pointer group"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Route */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white">{flight.departure_icao}</div>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5 px-2">
                                            <div className="w-16 h-[1px] bg-gradient-to-r from-emerald-500 via-accent-gold to-red-500 relative">
                                                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent-gold rotate-90" />
                                            </div>
                                            <span className="text-[9px] font-mono text-gray-600">{formatDuration(flight.flight_time)}</span>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white">{flight.arrival_icao}</div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3">
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Flight</div>
                                            <div className="text-sm font-bold text-white font-mono">{flight.flight_number}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Aircraft</div>
                                            <div className="text-sm font-mono text-gray-300">{flight.aircraft_type}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Landing</div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-sm font-mono font-bold ${landingGrade.color.split(' ')[0]}`}>
                                                    {flight.landing_rate} fpm
                                                </span>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${landingGrade.color}`}>
                                                    {landingGrade.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Score</div>
                                            <div className="flex items-center gap-1">
                                                <Star size={11} className="text-accent-gold" />
                                                <span className="text-sm font-bold text-white">{flight.score}</span>
                                                <span className="text-[9px] text-gray-600">/100</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">CR</div>
                                            <div className="flex items-center gap-1">
                                                <Zap size={11} className="text-emerald-400" />
                                                <span className="text-sm font-bold text-emerald-400">{flight.credits_earned || 0}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Date</div>
                                            <div className="text-sm text-gray-400 font-mono">
                                                {new Date(flight.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center">
                                        {getStatusBadge(flight.approved_status)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-600 font-mono">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchHistory(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => fetchHistory(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
