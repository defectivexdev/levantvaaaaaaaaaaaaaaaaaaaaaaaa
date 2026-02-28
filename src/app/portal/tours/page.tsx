'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Map, ArrowRight, Loader2, Award, BookOpen, CheckCircle, Plane, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Tour {
    _id: string;
    name: string;
    description: string;
    image?: string;
    banner?: string;
    award_image?: string;
    legs: any[];
    total_distance: number;
    reward_credits: number;
    difficulty: 'easy' | 'medium' | 'hard';
    active: boolean;
    userProgress?: {
        completed: boolean;
        completedLegs: number;
        totalLegs: number;
    };
}

export default function ToursPage() {
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [query, setQuery] = useState('');

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const apiStatus = useMemo(() => {
        if (filter === 'active') return 'active';
        if (filter === 'completed') return 'completed';
        return '';
    }, [filter]);

    const fetchTours = async (opts: { page: number; append: boolean }) => {
        const { page: nextPage, append } = opts;
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (apiStatus) params.set('status', apiStatus);
            params.set('page', String(nextPage));
            params.set('limit', '12');

            const res = await fetch(`/api/portal/tours?${params.toString()}`);
            const data = await res.json();
            const incoming: Tour[] = data.tours || [];

            const total = typeof data.total === 'number' ? data.total : incoming.length;
            const limit = typeof data.limit === 'number' ? data.limit : 12;

            setTours(prev => {
                const nextTours = append ? [...prev, ...incoming] : incoming;
                setHasMore(nextTours.length < total && incoming.length >= limit);
                return nextTours;
            });
        } catch (error) {
            console.error('Failed to fetch tours', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setPage(1);
        fetchTours({ page: 1, append: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiStatus]);

    useEffect(() => {
        const t = setTimeout(() => {
            setLoading(true);
            setPage(1);
            fetchTours({ page: 1, append: false });
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;
        const next = page + 1;
        setLoadingMore(true);
        setPage(next);
        await fetchTours({ page: next, append: true });
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin w-12 h-12 text-cyan-400" />
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-white/10 p-8">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="relative">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">World Tours</h1>
                            <p className="text-gray-400 text-sm mt-1">Complete multi-leg journeys around the world</p>
                        </div>
                    </div>
                    <Link
                        href="/portal/tours/rules"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-cyan-400 hover:text-cyan-300 transition-all"
                    >
                        <BookOpen className="w-4 h-4" />
                        Read Tour Rules & Guidelines
                    </Link>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                {[{ key: 'all', label: 'All Tours' }, { key: 'active', label: 'Active' }, { key: 'completed', label: 'Completed' }].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key as any)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                            filter === tab.key
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search tours..."
                            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                    </div>

                    <div className="text-xs text-gray-500 flex items-center justify-between px-3 py-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="uppercase tracking-widest font-bold">Loaded</span>
                        <span className="font-mono text-gray-300">{tours.length}</span>
                    </div>
                </div>
            </div>

            {/* Tours Grid */}
            {tours.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                    <Map className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-500 text-lg">No tours found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tours.map((tour, index) => (
                        <motion.div
                            key={tour._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/portal/tours/${tour._id}`}>
                                <div className="group relative bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10">
                                    {/* Banner Image */}
                                    <div className="relative h-48 overflow-hidden">
                                        {tour.image ? (
                                            <img
                                                src={tour.image}
                                                alt={tour.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                                                <Map className="w-16 h-16 text-cyan-400/30" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        
                                        {/* Status Badges */}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                                                tour.difficulty === 'easy' ? 'bg-green-500/90 text-white' :
                                                tour.difficulty === 'hard' ? 'bg-red-500/90 text-white' :
                                                'bg-yellow-500/90 text-black'
                                            }`}>
                                                {tour.difficulty}
                                            </span>
                                            {tour.userProgress?.completed && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md shadow-lg flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Completed
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        {tour.userProgress && !tour.userProgress.completed && tour.userProgress.completedLegs > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-white font-semibold">Progress</span>
                                                        <span className="text-xs text-cyan-400 font-mono">
                                                            {tour.userProgress.completedLegs}/{tour.userProgress.totalLegs}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(tour.userProgress.completedLegs / tour.userProgress.totalLegs) * 100}%` }}
                                                            transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <h2 className="text-2xl font-black text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                                {tour.name}
                                            </h2>
                                            <p className="text-gray-400 text-sm line-clamp-2">{tour.description}</p>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
                                            <div className="text-center">
                                                <div className="flex items-center justify-center mb-2">
                                                    <Plane className="w-5 h-5 text-cyan-400" />
                                                </div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Legs</p>
                                                <p className="text-white font-bold text-lg">{tour.legs?.length || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center mb-2">
                                                    <Award className="w-5 h-5 text-yellow-400" />
                                                </div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Reward</p>
                                                <p className="text-emerald-400 font-bold text-lg">{tour.reward_credits?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center mb-2">
                                                    <Map className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Distance</p>
                                                <p className="text-white font-bold text-lg">{tour.total_distance || 0} nm</p>
                                            </div>
                                        </div>

                                        {/* CTA Button */}
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                                                <span className="text-sm font-semibold text-white">
                                                    {tour.userProgress?.completed ? 'View Details' : 'Start Tour'}
                                                </span>
                                                <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Load More */}
            {!loading && tours.length > 0 && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleLoadMore}
                        disabled={!hasMore || loadingMore}
                        className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all bg-white/5 text-gray-200 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                    >
                        {loadingMore ? 'Loading...' : (hasMore ? 'Load More' : 'No More Tours')}
                    </button>
                </div>
            )}
        </div>
    );
}
