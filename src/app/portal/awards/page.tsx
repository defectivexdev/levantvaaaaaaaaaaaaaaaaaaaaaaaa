'use client';
import { useState, useEffect } from 'react';
import { Award, Trophy, Check } from 'lucide-react';

export default function AwardsPage() {
    const [awards, setAwards] = useState<any[]>([]);
    const [myAwards, setMyAwards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [awardsRes, myRes] = await Promise.all([
                fetch('/api/awards'),
                fetch('/api/awards/my')
            ]);
            
            const awardsData = await awardsRes.json();
            const myData = await myRes.json().catch(() => []);
            
            setAwards(awardsData);
            setMyAwards(Array.isArray(myData) ? myData : []);
        } catch (err) {
            console.error('Error fetching awards:', err);
        } finally {
            setLoading(false);
        }
    };

    const earnedAwardIds = myAwards.map((pa: any) => 
        pa.award_id?._id?.toString() || pa.award_id?.toString()
    );

    const isEarned = (awardId: string) => earnedAwardIds.includes(awardId);

    const getEarnedDate = (awardId: string) => {
        const pa = myAwards.find((p: any) => 
            (p.award_id?._id?.toString() || p.award_id?.toString()) === awardId
        );
        return pa?.earned_at ? new Date(pa.earned_at).toLocaleDateString() : null;
    };

    const filteredAwards = awards.filter((award: any) => {
        if (filter === 'earned') return isEarned(award._id);
        if (filter === 'locked') return !isEarned(award._id);
        return true;
    });

    // Group by category
    const categories = [...new Set(awards.map((a: any) => a.category || 'General'))];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header + Stats + Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Awards</h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {myAwards.length} of {awards.length} earned
                    </p>
                </div>
                <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-white/[0.06]">
                    {([['all', `All ${awards.length}`], ['earned', `Earned ${myAwards.length}`], ['locked', `Locked ${awards.length - myAwards.length}`]] as const).map(([key, label]) => (
                        <button 
                            key={key}
                            onClick={() => setFilter(key as any)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                filter === key ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Collection Progress</span>
                    <span className="text-xs font-bold text-accent-gold font-mono">{awards.length > 0 ? Math.round((myAwards.length / awards.length) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent-gold to-amber-600 rounded-full transition-all duration-500" style={{ width: `${awards.length > 0 ? (myAwards.length / awards.length) * 100 : 0}%` }} />
                </div>
            </div>

            {/* Awards by Category */}
            {categories.map(category => {
                const categoryAwards = filteredAwards.filter((a: any) => 
                    (a.category || 'General') === category
                );
                
                if (categoryAwards.length === 0) return null;

                return (
                    <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-accent-gold" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{category}</h2>
                            <span className="text-[10px] text-gray-600 font-mono">{categoryAwards.length}</span>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryAwards.map((award: any) => {
                                const earned = isEarned(award._id);
                                const earnedDate = getEarnedDate(award._id);
                                
                                return (
                                    <div 
                                        key={award._id} 
                                        className={`bg-[#0a0a0a] border rounded-2xl p-4 flex gap-4 transition-all ${
                                            earned 
                                                ? 'border-emerald-500/20' 
                                                : 'border-white/[0.06] opacity-50 grayscale hover:opacity-70 hover:grayscale-0'
                                        }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {award.imageUrl ? (
                                                <img src={`/img/award/${award.imageUrl}`} alt={award.name} className="w-14 h-14 object-contain" />
                                            ) : (
                                                <div className="w-14 h-14 bg-[#111] rounded-xl flex items-center justify-center border border-white/[0.06]">
                                                    <Award className="w-6 h-6 text-accent-gold" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-bold text-white truncate">{award.name}</h3>
                                                {earned && (
                                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                                                        <Check className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                            {award.description && (
                                                <p className="text-gray-500 text-xs line-clamp-2">{award.description}</p>
                                            )}
                                            {earnedDate && (
                                                <p className="text-[10px] text-emerald-400/60 mt-1 font-mono">Earned {earnedDate}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {filteredAwards.length === 0 && (
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500 text-sm">
                    No awards found matching your filter.
                </div>
            )}
        </div>
    );
}
