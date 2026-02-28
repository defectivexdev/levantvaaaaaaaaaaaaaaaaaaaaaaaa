'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, Search, UserX, AlertTriangle, X, Clock, Plane, MapPin, CreditCard, ChevronDown, Shield, Mail, Globe, Hash, ArrowUpDown, KeyRound, Trash2 } from 'lucide-react';

interface User {
    id: string;
    pilotId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    totalHours: number;
    transferHours: number;
    totalFlights: number;
    totalCredits: number;
    balance: number;
    rank: string;
    country: string;
    city: string;
    timezone: string;
    currentLocation: string;
    createdAt: string;
    lastActivity: string | null;
}

const statusConfig: Record<string, { dot: string; bg: string; text: string }> = {
    'Active':          { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
    'Inactive':        { dot: 'bg-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-400' },
    'Blacklist':       { dot: 'bg-red-400',      bg: 'bg-red-500/10 border-red-500/20',         text: 'text-red-400' },
    'Pending':         { dot: 'bg-blue-400',     bg: 'bg-blue-500/10 border-blue-500/20',       text: 'text-blue-400' },
    'On leave (LOA)':  { dot: 'bg-gray-400',     bg: 'bg-gray-500/10 border-gray-500/20',       text: 'text-gray-400' },
};

const roleColors: Record<string, string> = {
    'Admin': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Pilot': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

const ranks = ['Cadet', 'Second Officer', 'First Officer', 'Captain', 'Senior Captain'];

type StatusFilter = 'All' | 'Active' | 'Inactive' | 'Pending' | 'On leave (LOA)' | 'Blacklist';
type SortKey = 'name' | 'hours' | 'flights' | 'balance' | 'lastActivity';

const inputClass = 'w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-all';
const selectClass = 'w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-all appearance-none';
const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [updating, setUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [error, setError] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.users) setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = useCallback((user: User) => {
        setSelectedUser(user);
        setError('');
        setShowDeleteConfirm(false);
        setEditForm({
            pilotId: user.pilotId, firstName: user.firstName, lastName: user.lastName,
            email: user.email, role: user.role, status: user.status, rank: user.rank,
            country: user.country, city: user.city, timezone: user.timezone,
            currentLocation: user.currentLocation, totalHours: user.totalHours,
            transferHours: user.transferHours, totalFlights: user.totalFlights,
            totalCredits: user.totalCredits, balance: user.balance,
        });
    }, []);

    const resetPassword = async () => {
        if (!selectedUser) return;
        setResettingPassword(true);
        setError('');
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resetPassword', userId: selectedUser.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
            alert(`Password reset email sent to ${selectedUser.email}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResettingPassword(false);
        }
    };

    const deleteAccount = async () => {
        if (!selectedUser) return;
        setDeletingAccount(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/users?userId=${selectedUser.id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete account');
            alert(`Account ${selectedUser.pilotId} deleted successfully`);
            setSelectedUser(null);
            setShowDeleteConfirm(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingAccount(false);
        }
    };

    const updateUser = async () => {
        if (!selectedUser) return;
        setUpdating(true);
        setError('');
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, ...editForm }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update user');
            await fetchUsers();
            setSelectedUser(null);
        } catch (error: any) {
            console.error('Error updating user:', error);
            setError(error.message || 'An unexpected error occurred');
        } finally {
            setUpdating(false);
        }
    };

    const toggleSort = useCallback((key: SortKey) => {
        if (sortKey === key) setSortAsc(p => !p);
        else { setSortKey(key); setSortAsc(true); }
    }, [sortKey]);

    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter(u => u.status === 'Active').length,
        pending: users.filter(u => u.status === 'Pending').length,
        inactive: users.filter(u => u.status === 'Inactive').length,
        loa: users.filter(u => u.status === 'On leave (LOA)').length,
        blacklisted: users.filter(u => u.status === 'Blacklist').length,
    }), [users]);

    const filteredUsers = useMemo(() => {
        let list = users;
        if (statusFilter !== 'All') list = list.filter(u => u.status === statusFilter);
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(u =>
                u.pilotId.toLowerCase().includes(q) ||
                u.firstName.toLowerCase().includes(q) ||
                u.lastName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            );
        }
        const dir = sortAsc ? 1 : -1;
        list = [...list].sort((a, b) => {
            switch (sortKey) {
                case 'hours': return (a.totalHours - b.totalHours) * dir;
                case 'flights': return (a.totalFlights - b.totalFlights) * dir;
                case 'balance': return (a.balance - b.balance) * dir;
                case 'lastActivity': return ((a.lastActivity || '') > (b.lastActivity || '') ? 1 : -1) * dir;
                default: return (`${a.firstName} ${a.lastName}` > `${b.firstName} ${b.lastName}` ? 1 : -1) * dir;
            }
        });
        return list;
    }, [users, searchTerm, statusFilter, sortKey, sortAsc]);

    const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();
    const getRankImage = (rank: string) => `/img/ranks/${rank.toLowerCase().replace(/\s/g, '')}.png`;
    const timeAgo = (d: string | null) => {
        if (!d) return 'Never';
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const statusTabs: { label: string; value: StatusFilter; count: number }[] = [
        { label: 'All', value: 'All', count: stats.total },
        { label: 'Active', value: 'Active', count: stats.active },
        { label: 'Pending', value: 'Pending', count: stats.pending },
        { label: 'Inactive', value: 'Inactive', count: stats.inactive },
        { label: 'LOA', value: 'On leave (LOA)', count: stats.loa },
        { label: 'Blacklist', value: 'Blacklist', count: stats.blacklisted },
    ];

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-[#111] rounded-2xl border border-white/[0.06]" />
                <div className="h-12 bg-[#111] rounded-2xl border border-white/[0.06]" />
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-[#111] rounded-2xl border border-white/[0.06]" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <p className="text-gray-500 text-xs mt-0.5">Manage {stats.total} registered pilots</p>
            </div>

            {/* Status Tabs + Search */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-white/[0.06] overflow-x-auto flex-shrink-0">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                                statusFilter === tab.value
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] font-mono ${statusFilter === tab.value ? 'text-accent-gold' : 'text-gray-600'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search by ID, name, or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/30 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-white transition-colors text-left">
                        Pilot {sortKey === 'name' && <ArrowUpDown size={10} className="text-accent-gold" />}
                    </button>
                    <span>Status</span>
                    <span>Role / Rank</span>
                    <button onClick={() => toggleSort('hours')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Hours {sortKey === 'hours' && <ArrowUpDown size={10} className="text-accent-gold" />}
                    </button>
                    <button onClick={() => toggleSort('flights')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Flights {sortKey === 'flights' && <ArrowUpDown size={10} className="text-accent-gold" />}
                    </button>
                    <button onClick={() => toggleSort('balance')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Balance {sortKey === 'balance' && <ArrowUpDown size={10} className="text-accent-gold" />}
                    </button>
                    <button onClick={() => toggleSort('lastActivity')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Last Seen {sortKey === 'lastActivity' && <ArrowUpDown size={10} className="text-accent-gold" />}
                    </button>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-white/[0.03]">
                    {filteredUsers.map(user => {
                        const sc = statusConfig[user.status] || statusConfig['Active'];
                        const rc = roleColors[user.role] || roleColors['Pilot'];
                        return (
                            <div
                                key={user.id}
                                onClick={() => openEditModal(user)}
                                className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-5 py-3 items-center cursor-pointer hover:bg-white/[0.02] transition-colors group"
                            >
                                {/* Pilot */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-[#161616] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 group-hover:border-accent-gold/20 transition-colors">
                                        {getInitials(user.firstName, user.lastName)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white truncate group-hover:text-accent-gold transition-colors">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                                            <span className="text-accent-gold/70">{user.pilotId}</span>
                                            <span className="text-gray-700">|</span>
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sc.bg} ${sc.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                        {user.status === 'On leave (LOA)' ? 'LOA' : user.status}
                                    </span>
                                </div>

                                {/* Role / Rank */}
                                <div className="flex flex-col gap-1">
                                    <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-md text-[10px] font-bold border ${rc}`}>
                                        {user.role}
                                    </span>
                                    <span className="text-[10px] text-gray-500 truncate">{user.rank}</span>
                                </div>

                                {/* Hours */}
                                <div className="text-sm font-mono font-bold text-white">{user.totalHours?.toFixed(1)}</div>

                                {/* Flights */}
                                <div className="text-sm font-mono font-bold text-white">{user.totalFlights}</div>

                                {/* Balance */}
                                <div className="text-sm font-mono font-bold text-emerald-400">{user.balance?.toLocaleString()}</div>

                                {/* Last Seen */}
                                <div className="text-[11px] text-gray-500 font-mono">{timeAgo(user.lastActivity)}</div>
                            </div>
                        );
                    })}
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-16">
                        <UserX className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                        <p className="text-sm text-gray-500">No pilots found{searchTerm && ` matching "${searchTerm}"`}</p>
                    </div>
                )}
            </div>

            <div className="text-[10px] text-gray-600 text-right font-mono">
                Showing {filteredUsers.length} of {stats.total} pilots
            </div>

            {/* ── Slide-over Edit Modal ── */}
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.05); } 50% { box-shadow: 0 0 40px rgba(212,175,55,0.12); } }
                .modal-backdrop { animation: fadeIn 0.3s ease-out forwards; }
                .modal-panel { animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .modal-panel:hover { box-shadow: -4px 0 30px rgba(0,0,0,0.4); }
                .modal-header { animation: fadeUp 0.4s ease-out 0.15s both; }
                .modal-stats { animation: fadeUp 0.4s ease-out 0.25s both; }
                .modal-section-1 { animation: fadeUp 0.4s ease-out 0.3s both; }
                .modal-section-2 { animation: fadeUp 0.4s ease-out 0.38s both; }
                .modal-section-3 { animation: fadeUp 0.4s ease-out 0.46s both; }
                .modal-section-4 { animation: fadeUp 0.4s ease-out 0.54s both; }
                .modal-glow { animation: glowPulse 3s ease-in-out infinite; }
            `}</style>
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedUser(null)}>
                    <div className="modal-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="modal-panel modal-glow relative w-full max-w-lg bg-[#0c0c0c] border-l border-accent-gold/[0.08] h-full overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header: User Profile Card */}
                        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.06] bg-gradient-to-br from-[#0c0c0c] to-[#111]">
                            {/* Top accent glow line */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className="modal-header flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-[#161616] border border-white/[0.08] flex items-center justify-center text-xl font-black text-gray-300">
                                        {getInitials(selectedUser.firstName, selectedUser.lastName)}
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 bg-[#0c0c0c] rounded-full p-0.5 border border-white/[0.08]" title={selectedUser.rank}>
                                        <img
                                            src={getRankImage(selectedUser.rank)}
                                            alt={selectedUser.rank}
                                            className="w-5 h-auto object-contain"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selectedUser.firstName} {selectedUser.lastName}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-accent-gold text-xs font-mono font-bold">{selectedUser.pilotId}</span>
                                        <span className="text-gray-600">|</span>
                                        <span className="text-gray-500 text-xs">{selectedUser.rank}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="modal-stats grid grid-cols-4 gap-2 mt-4">
                                {[
                                    { label: 'Hours', value: selectedUser.totalHours?.toFixed(1), color: 'text-white' },
                                    { label: 'Flights', value: selectedUser.totalFlights, color: 'text-white' },
                                    { label: 'Total CR', value: selectedUser.totalCredits?.toLocaleString(), color: 'text-amber-400' },
                                    { label: 'Balance', value: selectedUser.balance?.toLocaleString(), color: 'text-emerald-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#0a0a0a] rounded-xl border border-white/[0.05] p-2.5 text-center">
                                        <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
                                        <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                <AlertTriangle size={16} className="flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Form Groups */}
                        <div className="p-6 space-y-6">
                            {/* Identity */}
                            <div className="modal-section-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Hash size={14} className="text-accent-gold" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Identity</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className={labelClass}>Pilot ID</label>
                                        <input type="text" value={editForm.pilotId || ''} onChange={e => setEditForm({ ...editForm, pilotId: e.target.value })} className={`${inputClass} font-mono font-bold text-accent-gold`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>First Name</label>
                                            <input type="text" value={editForm.firstName || ''} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Last Name</label>
                                            <input type="text" value={editForm.lastName || ''} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email</label>
                                        <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* Role & Status */}
                            <div className="modal-section-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield size={14} className="text-accent-gold" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Role & Status</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={labelClass}>Role</label>
                                        <select value={editForm.role || ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className={selectClass}>
                                            <option value="Pilot">Pilot</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <select value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={selectClass}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                            <option value="On leave (LOA)">On leave (LOA)</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Blacklist">Blacklist</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Rank</label>
                                        <select value={editForm.rank || ''} onChange={e => setEditForm({ ...editForm, rank: e.target.value })} className={selectClass}>
                                            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="modal-section-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe size={14} className="text-accent-gold" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Location</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Country</label>
                                        <input type="text" value={editForm.country || ''} onChange={e => setEditForm({ ...editForm, country: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>City</label>
                                        <input type="text" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Timezone</label>
                                        <input type="text" value={editForm.timezone || ''} onChange={e => setEditForm({ ...editForm, timezone: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Current Location (ICAO)</label>
                                        <input type="text" value={editForm.currentLocation || ''} onChange={e => setEditForm({ ...editForm, currentLocation: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} maxLength={4} />
                                    </div>
                                </div>
                            </div>

                            {/* Flight Stats */}
                            <div className="modal-section-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Plane size={14} className="text-accent-gold" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Flight Stats</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Total Hours (ACARS)</label>
                                        <input type="number" step="0.1" value={editForm.totalHours ?? 0} onChange={e => setEditForm({ ...editForm, totalHours: parseFloat(e.target.value) || 0 })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Transfer Hours</label>
                                        <input type="number" step="0.1" value={editForm.transferHours ?? 0} onChange={e => setEditForm({ ...editForm, transferHours: parseFloat(e.target.value) || 0 })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Total Flights</label>
                                        <input type="number" value={editForm.totalFlights ?? 0} onChange={e => setEditForm({ ...editForm, totalFlights: parseInt(e.target.value) || 0 })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Balance (Credits)</label>
                                        <input type="number" value={editForm.balance ?? 0} onChange={e => setEditForm({ ...editForm, balance: parseInt(e.target.value) || 0 })} className={`${inputClass} font-bold text-emerald-400`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="sticky bottom-0 bg-[#0c0c0c]/90 backdrop-blur-sm border-t border-white/[0.06] px-6 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={resetPassword}
                                        disabled={resettingPassword}
                                        className="px-3 py-2 rounded-xl text-xs font-bold text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <KeyRound size={12} />
                                        {resettingPassword ? 'Sending...' : 'Reset Password'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-1.5"
                                    >
                                        <Trash2 size={12} />
                                        Delete Account
                                    </button>
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono">
                                    Joined {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—'}
                                </span>
                            </div>
                            {showDeleteConfirm && (
                                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-xs text-red-400 mb-2">⚠️ Are you sure? This action cannot be undone!</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={deleteAccount}
                                            disabled={deletingAccount}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                                        >
                                            {deletingAccount ? 'Deleting...' : 'Yes, Delete'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setShowDeleteConfirm(false);
                                        setError('');
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={updateUser}
                                    disabled={updating}
                                    className="flex-1 px-5 py-2 rounded-xl text-xs font-bold bg-accent-gold text-black hover:bg-accent-gold/90 transition-all disabled:opacity-50"
                                >
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
