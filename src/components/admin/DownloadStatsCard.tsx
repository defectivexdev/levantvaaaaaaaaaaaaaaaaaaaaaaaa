'use client';

import { useEffect, useState } from 'react';
import { Download, TrendingUp, History } from 'lucide-react';

interface StatItem {
    _id: string;
    totalDownloads: number;
    lastDownload: string;
}

export const DownloadStatsCard = () => {
    const [stats, setStats] = useState<StatItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/download-stats')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setStats(data);
            })
            .catch(err => console.error("Failed to fetch download stats:", err))
            .finally(() => setLoading(false));
    }, []);

    const maxDownloads = Math.max(...stats.map(s => s.totalDownloads), 1);

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/[0.08] backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Download size={80} />
            </div>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent-gold/10 rounded-lg border border-accent-gold/20">
                    <TrendingUp size={20} className="text-accent-gold" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Client Distribution</h3>
                    <p className="text-xs text-gray-400">Downloads per version</p>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse h-8 bg-white/5 rounded-lg" />
                        ))}
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm italic">
                        No download data recorded yet.
                    </div>
                ) : (
                    stats.map((item) => (
                        <div key={item._id} className="group/item">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-accent-gold font-bold">{item._id}</span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <History size={10} />
                                        {new Date(item.lastDownload).toLocaleDateString()}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-white">{item.totalDownloads}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
                                <div 
                                    className="h-full bg-gradient-to-r from-accent-gold to-[#b8860b] shadow-[0_0_8px_rgba(212,175,55,0.3)] transition-all duration-1000 ease-out" 
                                    style={{ width: `${(item.totalDownloads / maxDownloads) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <div className="flex justify-between text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                    <span>Total Reach</span>
                    <span className="text-white font-bold">{stats.reduce((acc, s) => acc + s.totalDownloads, 0)} Downloads</span>
                </div>
            </div>
        </div>
    );
};
