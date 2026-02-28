'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, 
    Plane, 
    FileText, 
    ShoppingBag, 
    Map, 
    Bell, 
    Settings,
    ArrowRight,
    Loader2,
    Check,
} from 'lucide-react';
import { DownloadStatsCard } from '@/components/admin/DownloadStatsCard';

interface AdminStats {
    totalPilots: number;
    activeFlights: number;
    totalFlights: number;
    pendingPireps: number;
    airlineBalance: number;
}

export default function AdminPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (res.ok) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const adminActions = [
        { 
            title: 'Manage Pilots', 
            description: 'Activate, suspend, or update pilot roles.',
            icon: <Users className="w-8 h-8 text-blue-400" />,
            link: '/portal/admin/pilots',
            count: stats?.totalPilots
        },
        { 
            title: 'Store Management', 
            description: 'Manage items, prices, and download links.',
            icon: <ShoppingBag className="w-8 h-8 text-accent-gold" />,
            link: '/portal/admin/store'
        },
        { 
            title: 'Tour Management', 
            description: 'Create multi-leg tours and rewards.',
            icon: <Map className="w-8 h-8 text-green-400" />,
            link: '/portal/admin/tours'
        },
        { 
            title: 'Audit PIREPs', 
            description: 'Review and approve pending flight reports.',
            icon: <FileText className="w-8 h-8 text-yellow-400" />,
            link: '/portal/admin/reports',
            count: stats?.pendingPireps,
            alert: (stats?.pendingPireps || 0) > 0
        },
    ];

    const statCards = [
        { label: 'Airline Balance', value: stats?.airlineBalance, format: (v: number) => `${v.toLocaleString()} cr`, color: 'text-emerald-400', icon: ShoppingBag, iconBg: 'bg-emerald-500/10' },
        { label: 'Total Pilots', value: stats?.totalPilots, color: 'text-white', icon: Users, iconBg: 'bg-blue-500/10' },
        { label: 'Active Flights', value: stats?.activeFlights, color: 'text-accent-gold', icon: Plane, iconBg: 'bg-accent-gold/10' },
        { label: 'Total PIREPs', value: stats?.totalFlights, color: 'text-white', icon: FileText, iconBg: 'bg-white/[0.04]' },
        { label: 'Pending Approval', value: stats?.pendingPireps, color: 'text-amber-400', icon: Clock, iconBg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Admin Control Center</h1>
                <p className="text-gray-500 text-xs mt-0.5">Levant Virtual Airline operations and management</p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {statCards.map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</div>
                            <div className={`text-xl font-bold font-mono ${s.color}`}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (s.format ? s.format(s.value || 0) : (s.value || 0).toLocaleString())}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Actions Grid */}
            <div className="grid md:grid-cols-2 gap-3">
                {adminActions.map((action) => (
                    <Link key={action.title} href={action.link} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 hover:border-accent-gold/20 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/[0.04] rounded-xl group-hover:bg-accent-gold/10 transition-colors">
                                    {action.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white group-hover:text-accent-gold transition-colors">{action.title}</h3>
                                        {action.count !== undefined && (
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${action.alert ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-white/[0.06] text-gray-500'}`}>
                                                {action.count}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-500 text-xs mt-0.5">{action.description}</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-accent-gold transition-colors" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Analytics & Stats */}
            <DownloadStatsCard />
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-3 gap-3">
                 <button className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-2 text-gray-600 cursor-not-allowed">
                     <Bell className="w-4 h-4" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Broadcast</span>
                 </button>
                 <button className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-2 text-gray-600 cursor-not-allowed">
                     <Settings className="w-4 h-4" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
                 </button>
                 <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                     <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">System</span>
                     <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online</span>
                 </div>
            </div>
        </div>
    );
}

function Clock({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
    );
}

