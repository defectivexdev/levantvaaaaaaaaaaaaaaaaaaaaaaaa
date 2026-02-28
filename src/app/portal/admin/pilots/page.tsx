'use client';

import { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Edit, 
    Shield, 
    ShieldAlert, 
    UserCheck, 
    UserX, 
    Clock,
    X,
    Check,
    AlertCircle,
    Loader2,
    Filter
} from 'lucide-react';
import RankBadge from '@/components/RankBadge';

interface Pilot {
    id: string;
    pilotId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'Pilot' | 'Admin';
    status: 'Pending' | 'Active' | 'Inactive' | 'Blacklist';
    rank: string;
    totalHours: number;
    totalFlights: number;
    totalCredits: number;
    lastActivity?: string;
    homeBase?: string;
    hub_manager?: string;
}

export default function AdminPilotsPage() {
    const [pilots, setPilots] = useState<Pilot[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // Modal state
    const [editing, setEditing] = useState<Pilot | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPilots = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) {
                setPilots(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch pilots:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPilots();
    }, []);

    const handleUpdate = async (userId: string, updates: any) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...updates }),
            });

            if (res.ok) {
                setEditing(null);
                fetchPilots();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update user');
            }
        } catch (error) {
            setError('Connection error');
        } finally {
            setSaving(false);
        }
    };

    const filteredPilots = pilots.filter(p => {
        const matchesSearch = `${p.pilotId} ${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Active': return <UserCheck className="w-4 h-4 text-green-500" />;
            case 'Pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'Inactive': return <UserX className="w-4 h-4 text-red-500" />;
            case 'Blacklist': return <ShieldAlert className="w-4 h-4 text-red-600 font-bold" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-accent-gold" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Pilot Management</h1>
                        <p className="text-gray-400">Manage {pilots.length} registered pilots</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by ID, Name or Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-accent-gold"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-accent-gold appearance-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="blacklist">Blacklist</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-gold" />
                    Loading pilots...
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#111]/50">
                                <tr className="text-left text-gray-500 text-xs uppercase tracking-widest border-b border-white/[0.06]">
                                    <th className="p-4">Pilot</th>
                                    <th className="p-4">Rank & Stats</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Last Activity</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredPilots.map((pilot) => (
                                    <tr key={pilot.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold font-bold">
                                                    {pilot.firstName[0]}{pilot.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{pilot.firstName} {pilot.lastName}</p>
                                                    <p className="text-accent-gold font-mono text-xs">{pilot.pilotId}</p>
                                                    <p className="text-gray-500 text-[10px] lowercase">{pilot.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <RankBadge rank={pilot.rank} size="sm" showText />
                                            <div className="flex gap-3 mt-1">
                                                <span className="text-[10px] text-gray-400 capitalize">{Math.round(pilot.totalHours)}h / {pilot.totalFlights} flights</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {pilot.role === 'Admin' ? (
                                                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/20 flex items-center gap-1">
                                                        <Shield className="w-3 h-3" /> ADMIN
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px] font-bold">PILOT</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs">
                                                {getStatusIcon(pilot.status)}
                                                <span className={
                                                    pilot.status === 'Active' ? 'text-green-500' :
                                                    pilot.status === 'Pending' ? 'text-yellow-500' :
                                                    'text-red-500'
                                                }>
                                                    {pilot.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {pilot.lastActivity ? new Date(pilot.lastActivity).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setEditing(pilot)}
                                                className="p-2 text-gray-400 hover:text-accent-gold transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0a0a] rounded-xl w-full max-w-md border border-white/[0.08] shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">Edit Pilot</h2>
                                <p className="text-xs text-accent-gold font-mono uppercase tracking-widest mt-0.5">{editing.pilotId}</p>
                            </div>
                            <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2 font-bold">Account Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Active', 'Pending', 'Inactive', 'Blacklist'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleUpdate(editing.id, { status: s })}
                                            className={`py-2 px-3 rounded border text-xs font-semibold transition-all ${
                                                editing.status === s 
                                                    ? 'bg-accent-gold border-accent-gold text-dark-900' 
                                                    : 'bg-[#111] border-white/[0.06] text-gray-400 hover:border-white/20'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/[0.06]">
                                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2 font-bold">User Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleUpdate(editing.id, { role: 'Pilot' })}
                                        className={`py-3 rounded border text-xs font-bold transition-all ${
                                            editing.role === 'Pilot' 
                                                ? 'bg-blue-500 border-blue-500 text-white' 
                                                : 'bg-[#111] border-white/[0.06] text-gray-400 hover:border-white/20'
                                        }`}
                                    >
                                        PILOT
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(editing.id, { role: 'Admin' })}
                                        className={`py-3 rounded border text-xs font-bold transition-all ${
                                            editing.role === 'Admin' 
                                                ? 'bg-purple-600 border-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' 
                                                : 'bg-[#111] border-white/[0.06] text-gray-400 hover:border-white/20'
                                        }`}
                                    >
                                        ADMIN
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/[0.06]">
                                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2 font-bold">Base Airport</label>
                                <select
                                    value={editing.homeBase || ''}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (val === 'RANDOM') {
                                            const options = ['OSDI', 'OJAI', 'ORBI'];
                                            val = options[Math.floor(Math.random() * options.length)];
                                        }
                                        handleUpdate(editing.id, { homeBase: val, currentLocation: val });
                                    }}
                                    className="w-full bg-[#111] border border-white/[0.06] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-gold"
                                >
                                    <option value="">Select Base</option>
                                    <option value="OSDI">Damascus (OSDI)</option>
                                    <option value="OJAI">Amman (OJAI)</option>
                                    <option value="ORBI">Baghdad (ORBI)</option>
                                    <option value="RANDOM">🎲 Random (OSDI/OJAI/ORBI)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-white/[0.06]">
                                <label className="block text-gray-500 text-xs uppercase tracking-wider mb-2 font-bold">Hub Manager</label>
                                <select
                                    value={editing.hub_manager || ''}
                                    onChange={(e) => handleUpdate(editing.id, { hub_manager: e.target.value || null })}
                                    className="w-full bg-[#111] border border-white/[0.06] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-gold"
                                >
                                    <option value="">None (Regular Pilot)</option>
                                    <option value="OJAI">OJAI Hub Manager</option>
                                    <option value="OSDI">OSDI Hub Manager</option>
                                    <option value="ORBI">ORBI Hub Manager</option>
                                </select>
                                <p className="text-[9px] text-gray-600 mt-1.5">Hub managers can approve PIREPs for flights at their assigned hub.</p>
                            </div>
                        </div>

                        <div className="p-6 bg-[#080808]/50 border-t border-white/[0.06] flex justify-end">
                            <button
                                onClick={() => setEditing(null)}
                                className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
