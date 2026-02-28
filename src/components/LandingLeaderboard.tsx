'use client';

import { useState, useEffect } from 'react';
import { Trophy, Star, Plane, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingLeaderboard() {
    const router = useRouter();
    const [landings, setLandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/portal/stats/butter-leaderboard');
            const data = await res.json();
            if (data.landings) {
                setLandings(data.landings);
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="glass-card p-6 animate-pulse">
            <div className="h-6 w-32 bg-white/5 rounded mb-4" />
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-white/5 rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-accent-gold/10 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="text-2xl animate-bounce-slow">🧈</div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Butter Leaderboard</h2>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Top Landings • Last 30 Days</p>
                    </div>
                </div>
                <Star className="text-accent-gold/20 w-8 h-8 rotate-12" />
            </div>

            <div className="p-3 space-y-2">
                {landings.map((landing, index) => (
                    <div 
                        key={landing._id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/[0.06] hover:border-accent-gold/30 hover:bg-accent-gold/5 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-sm ${
                                index === 0 ? 'bg-accent-gold text-dark-900' : 
                                index === 1 ? 'bg-gray-300 text-dark-900' :
                                index === 2 ? 'bg-orange-400 text-dark-900' : 
                                'bg-white/10 text-gray-400'
                            }`}>
                                {index + 1}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm leading-tight group-hover:text-accent-gold transition-colors">
                                    {landing.pilot_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                        <Plane size={10} /> {landing.aircraft_type}
                                    </span>
                                    <span className="text-gray-700 text-[8px]">•</span>
                                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                        <MapPin size={10} className="text-accent-gold" /> {landing.arrival_icao}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-emerald-400 font-mono font-bold text-sm">
                                {landing.landing_rate} <span className="text-[8px] opacity-50">FPM</span>
                            </div>
                            {landing.log?.landingAnalysis?.butterScore && (
                                <div className="text-[10px] text-accent-gold font-bold flex items-center justify-end gap-1">
                                    <Star size={8} fill="currentColor" /> {landing.log.landingAnalysis.butterScore.toFixed(1)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {landings.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm italic">
                        No butter recorded yet this month.
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-white/5 border-t border-white/[0.06] text-center">
                <button 
                    onClick={() => router.push('/portal/leaderboard?tab=landing')}
                    className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest transition-colors"
                >
                    View Full Rankings →
                </button>
            </div>
        </div>
    );
}

const style = `
@keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
.animate-bounce-slow {
    animation: bounce-slow 3s ease-in-out infinite;
}
`;
