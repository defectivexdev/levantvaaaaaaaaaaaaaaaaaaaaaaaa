'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Search, Plus, Trash2, Loader2, AlertCircle, CheckCircle, UserX } from 'lucide-react';

interface BlacklistEntry {
    id: string;
    pilotId: string;
    username: string;
    email: string;
    reason: string;
    adminId: string;
    createdAt: string;
}

export default function BlacklistManagementPage() {
    const [entries, setEntries] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userId, setUserId] = useState('');
    const [reason, setReason] = useState('');
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [pilotLookup, setPilotLookup] = useState<{ name: string; email: string; pilotId: string } | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const lookupTimer = useState<NodeJS.Timeout | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const handleUserIdChange = (value: string) => {
        setUserId(value);
        setPilotLookup(null);
        if (lookupTimer[0]) clearTimeout(lookupTimer[0]);
        if (!value.trim() || value.trim().length < 3) return;
        setLookupLoading(true);
        lookupTimer[0] = setTimeout(async () => {
            try {
                const res = await fetch(`/api/pilots?id=${encodeURIComponent(value.trim())}`);
                const data = await res.json();
                if (data.pilot) {
                    setPilotLookup({
                        name: `${data.pilot.first_name} ${data.pilot.last_name}`,
                        email: data.pilot.email,
                        pilotId: data.pilot.pilot_id,
                    });
                }
            } catch { /* silent */ }
            finally { setLookupLoading(false); }
        }, 400);
    };

    const fetchBlacklist = async () => {
        try {
            const res = await fetch('/api/admin/blacklist');
            const data = await res.json();
            if (data.success) {
                setEntries(data.entries);
            } else {
                showToast('error', data.error || 'Failed to fetch blacklist');
            }
        } catch {
            showToast('error', 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlacklist();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId.trim()) return;
        setAdding(true);
        try {
            const res = await fetch('/api/admin/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId.trim(), reason: reason.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setEntries(prev => [data.entry, ...prev]);
                setUserId('');
                setReason('');
                showToast('success', data.message);
            } else {
                showToast('error', data.error || 'Failed to add');
            }
        } catch {
            showToast('error', 'Connection error');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (id: string) => {
        setRemoving(id);
        // Optimistic UI: remove immediately
        const prev = entries;
        setEntries(entries.filter(e => e.id !== id));
        try {
            const res = await fetch(`/api/admin/blacklist?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message);
            } else {
                setEntries(prev); // rollback
                showToast('error', data.error || 'Failed to remove');
            }
        } catch {
            setEntries(prev); // rollback
            showToast('error', 'Connection error');
        } finally {
            setRemoving(null);
        }
    };

    const filtered = entries.filter(e =>
        `${e.pilotId} ${e.username} ${e.email} ${e.reason}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl animate-in slide-in-from-top-2 ${
                    toast.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Blacklist Management</h1>
                        <p className="text-gray-400">{entries.length} restricted {entries.length === 1 ? 'account' : 'accounts'}</p>
                    </div>
                </div>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="glass-card p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-accent-gold" />
                    Add to Blacklist
                </h3>
                <div className="grid md:grid-cols-3 gap-3">
                    <div className="relative">
                        <UserX className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Pilot ID (e.g. LVT0001)..."
                            value={userId}
                            onChange={(e) => handleUserIdChange(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-gold"
                            required
                        />
                        {lookupLoading && (
                            <div className="absolute right-3 top-3.5">
                                <Loader2 size={14} className="animate-spin text-gray-500" />
                            </div>
                        )}
                        {pilotLookup && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-[#0a0a0a] border border-emerald-500/30 rounded-lg px-3 py-2 z-10 flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                <span className="text-sm text-white font-medium">{pilotLookup.name}</span>
                                <span className="text-xs text-gray-500 font-mono">{pilotLookup.pilotId}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Reason for blacklisting..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-gold"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding || !userId.trim()}
                        className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {adding ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                        Blacklist
                    </button>
                </div>
            </form>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by ID, name, email, or reason..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-accent-gold"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-gold" />
                    Loading blacklist...
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-500">
                    {entries.length === 0 ? 'No blacklisted users' : 'No results match your search'}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#111]/50">
                                <tr className="text-left text-gray-500 text-xs uppercase tracking-widest border-b border-white/[0.06]">
                                    <th className="p-4">Pilot</th>
                                    <th className="p-4">Reason</th>
                                    <th className="p-4">Blacklisted By</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((entry) => (
                                    <tr key={entry.id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                                    <UserX size={14} className="text-red-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{entry.username}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{entry.pilotId} &middot; {entry.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-gray-300">{entry.reason}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-mono text-gray-500">{entry.adminId}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-gray-500">
                                                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleRemove(entry.id)}
                                                disabled={removing === entry.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                                                title="Remove from blacklist"
                                            >
                                                {removing === entry.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                Unban
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
