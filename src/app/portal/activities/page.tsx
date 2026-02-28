'use client';
import { useState, useEffect } from 'react';
import ActivityCard from '@/components/ActivityCard';
import { Map, Calendar } from 'lucide-react';

export default function ActivitiesPage() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'Event' | 'Tour'>('all');

    useEffect(() => {
        fetchActivities();
    }, [filter]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const url = filter === 'all' 
                ? '/api/activities' 
                : `/api/activities?type=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            setActivities(data);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setLoading(false);
        }
    };

    // Separate into Tours and Events
    const tours = activities.filter(a => a.type === 'Tour');
    const events = activities.filter(a => a.type === 'Event');

    return (
        <div className="space-y-6">
            {/* Header + Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tours & Events</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Community activities, group flights, and multi-leg tours</p>
                </div>
                <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-white/[0.06]">
                    {([['all', 'All', null], ['Tour', 'Tours', Map], ['Event', 'Events', Calendar]] as const).map(([key, label, Icon]) => (
                        <button 
                            key={key}
                            onClick={() => setFilter(key as any)}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                filter === key ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-[#0a0a0a] rounded-2xl border border-white/[0.06]" />)}
                </div>
            ) : (
                <>
                    {/* Tours Section */}
                    {(filter === 'all' || filter === 'Tour') && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Map className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tours</h2>
                                <span className="text-[10px] text-gray-600 font-mono">{tours.length}</span>
                            </div>
                            {tours.length > 0 ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {tours.map((activity) => (
                                        <ActivityCard key={activity._id} activity={activity} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center text-gray-500 text-sm">
                                    No tours available
                                </div>
                            )}
                        </section>
                    )}

                    {/* Events Section */}
                    {(filter === 'all' || filter === 'Event') && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Events</h2>
                                <span className="text-[10px] text-gray-600 font-mono">{events.length}</span>
                            </div>
                            {events.length > 0 ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.map((activity) => (
                                        <ActivityCard key={activity._id} activity={activity} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center text-gray-500 text-sm">
                                    No events available
                                </div>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
