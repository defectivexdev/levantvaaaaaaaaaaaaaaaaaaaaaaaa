'use client';

import { useState, useEffect } from 'react';
import { Paintbrush, Download, Search, Monitor, Loader2, FileArchive } from 'lucide-react';

interface Livery {
    name: string;
    simulator: string;
    filename: string;
    download_url: string;
    size: number;
}

const SIM_ICONS: Record<string, string> = {
    'MSFS': '🖥️',
    'X-Plane': '✈️',
    'P3D': '🎮',
    'FSX': '🎮',
};

export default function LiveriesPage() {
    const [liveries, setLiveries] = useState<Livery[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLiveries();
    }, []);

    const fetchLiveries = async () => {
        try {
            const res = await fetch('/api/liveries');
            const data = await res.json();
            if (data.success) setLiveries(data.liveries);
        } catch (err) {
            console.error('Error fetching liveries:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '—';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filtered = liveries.filter(l =>
        `${l.simulator} ${l.name} ${l.filename}`.toLowerCase().includes(search.toLowerCase())
    );

    // Group by simulator platform
    const grouped = filtered.reduce<Record<string, Livery[]>>((acc, l) => {
        if (!acc[l.simulator]) acc[l.simulator] = [];
        acc[l.simulator].push(l);
        return acc;
    }, {});

    const simulators = Object.keys(grouped).sort();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Liveries</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Download official Levant Virtual Airlines liveries</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search liveries..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/30 transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
                </div>
            ) : simulators.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-500">
                    <FileArchive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold text-gray-400 mb-1">No Liveries Available</p>
                    <p className="text-sm">There are no liveries uploaded yet. Check back soon!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {simulators.map((sim) => (
                        <div key={sim}>
                            <div className="flex items-center gap-2 mb-4">
                                <Monitor className="w-5 h-5 text-accent-gold" />
                                <h2 className="text-xl font-bold text-white">
                                    {SIM_ICONS[sim] || '📦'} {sim}
                                </h2>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                    {grouped[sim].length} {grouped[sim].length === 1 ? 'livery' : 'liveries'}
                                </span>
                            </div>
                            <div className="glass-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#111]/50">
                                            <tr className="text-left text-gray-500 text-xs uppercase tracking-widest border-b border-white/[0.06]">
                                                <th className="p-4">Livery</th>
                                                <th className="p-4">File</th>
                                                <th className="p-4">Size</th>
                                                <th className="p-4 text-right">Download</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grouped[sim].map((livery) => (
                                                <tr key={livery.filename} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                                                                <FileArchive size={14} className="text-accent-gold" />
                                                            </div>
                                                            <span className="text-sm font-medium text-white">{livery.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs text-gray-500 font-mono">{livery.filename}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-sm text-gray-400 font-mono">{formatFileSize(livery.size)}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <a
                                                            href={livery.download_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/20 text-accent-gold text-xs font-bold rounded-lg transition-all"
                                                        >
                                                            <Download size={12} />
                                                            ZIP
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
