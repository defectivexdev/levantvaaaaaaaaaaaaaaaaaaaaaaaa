'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Info, MessageSquare, Trash2, ExternalLink, Image, AlertTriangle } from 'lucide-react';

interface PIREP {
    _id: string;
    pilot_name: string;
    flight_number: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    aircraft_type: string;
    flight_time: number;
    landing_rate: number;
    score: number;
    approved_status: number; // 0=Pending, 1=Approved, 2=Rejected
    submitted_at: string;
    comments?: string;
    admin_comments?: string;
    is_manual?: boolean;
    tracker_link?: string;
    proof_image?: string;
}

function isA380(aircraft: string): boolean {
    const normalized = (aircraft || '').replace(/[\s\-_]/g, '').toUpperCase();
    return normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380');
}

export default function AdminPirepsPage() {
    const [pireps, setPireps] = useState<PIREP[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPirep, setSelectedPirep] = useState<PIREP | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);

    useEffect(() => {
        fetchPireps();
    }, [statusFilter]);

    const fetchPireps = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/pireps?status=${statusFilter}`);
            const data = await res.json();
            if (data.pireps) {
                setPireps(data.pireps);
            }
        } catch (error) {
            console.error('Error fetching PIREPs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: string, status: number) => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/pireps/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    approved_status: status,
                    admin_comments: adminComment
                })
            });

            if (res.ok) {
                setSelectedPirep(null);
                setAdminComment('');
                fetchPireps();
            }
        } catch (error) {
            console.error('Error reviewing PIREP:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to DELETE this PIREP? This will also reverse the Pilot\'s credits and statistics.')) return;
        
        setProcessing(true);
        try {
            const res = await fetch(`/api/admin/pireps/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setSelectedPirep(null);
                fetchPireps();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete PIREP');
            }
        } catch (error) {
            console.error('Error deleting PIREP:', error);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">PENDING</span>;
            case 1: return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">APPROVED</span>;
            case 2: return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">REJECTED</span>;
            default: return null;
        }
    };

    const filteredPireps = useMemo(() => {
        return pireps.filter(p => {
            const matchesSearch = p.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.pilot_name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [pireps, searchTerm]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckCircle className="text-accent-gold w-8 h-8" />
                PIREP Management
            </h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected', 'all'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === s 
                                ? 'bg-accent-gold text-dark-900 shadow-lg' 
                                : 'bg-[#111] text-gray-400 hover:text-white border border-white/[0.06]'
                            }`}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by Pilot or Callsign..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.currentTarget.value)}
                        className="w-full bg-[#111] border border-white/[0.06] rounded-lg pl-10 pr-4 py-2 text-white focus:border-accent-gold outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Pilot</th>
                            <th className="px-6 py-4">Flight</th>
                            <th className="px-6 py-4">Rate</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 animate-pulse">
                                    Loading flight reports...
                                </td>
                            </tr>
                        ) : filteredPireps.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No flight reports found.
                                </td>
                            </tr>
                        ) : filteredPireps.map(p => (
                            <tr key={p._id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <p className="text-white font-medium">{p.pilot_name}</p>
                                            <p className={`text-xs ${isA380(p.aircraft_type) ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                                                {isA380(p.aircraft_type) && '⚠ '}{p.aircraft_type}
                                            </p>
                                        </div>
                                        {p.is_manual && (
                                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded border border-red-500/30 uppercase tracking-wider">Manual</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-accent-gold font-mono font-bold">
                                    {p.callsign}
                                    <span className="block text-[10px] text-gray-500 uppercase">{p.departure_icao} ➜ {p.arrival_icao}</span>
                                </td>
                                <td className={`px-6 py-4 font-mono ${p.landing_rate < -500 ? 'text-red-400' : 'text-gray-300'}`}>
                                    {p.landing_rate} fpm
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-bold ${p.score < 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {p.score}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400">
                                    {new Date(p.submitted_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => setSelectedPirep(p)}
                                        className="text-xs bg-white/10 hover:bg-accent-gold hover:text-dark-900 px-3 py-1 rounded transition-all font-bold"
                                    >
                                        REVIEW
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedPirep && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPirep(null)} />
                    <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{selectedPirep.callsign}</h3>
                                <p className="text-gray-400">{selectedPirep.pilot_name} • {selectedPirep.aircraft_type}</p>
                            </div>
                            {getStatusBadge(selectedPirep.approved_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="bg-[#111]/50 p-4 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase mb-1">Flight Time</p>
                                <p className="text-xl text-white font-mono">{Math.floor(selectedPirep.flight_time / 60)}h {selectedPirep.flight_time % 60}m</p>
                            </div>
                            <div className="bg-[#111]/50 p-4 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase mb-1">Landing Rate</p>
                                <p className={`text-xl font-mono ${selectedPirep.landing_rate < -500 ? 'text-red-400' : 'text-emerald-400'}`}>{selectedPirep.landing_rate} fpm</p>
                            </div>
                        </div>

                        {/* Manual Submission Proof */}
                        {selectedPirep.is_manual && (
                            <div className="mb-6 space-y-3">
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-400" />
                                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Manual Submission — Verify Proof Before Approving</span>
                                </div>
                                {selectedPirep.tracker_link && (
                                    <a
                                        href={selectedPirep.tracker_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold hover:bg-accent-gold/20 transition-colors text-sm font-bold"
                                    >
                                        <ExternalLink size={14} /> Verify External Stats
                                    </a>
                                )}
                                {selectedPirep.proof_image && (
                                    <button
                                        onClick={() => setLightboxImg(selectedPirep.proof_image!)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-bold"
                                    >
                                        <Image size={14} /> View Screenshot Proof
                                    </button>
                                )}
                            </div>
                        )}

                        {/* A380 Warning */}
                        {isA380(selectedPirep.aircraft_type) && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                                <AlertTriangle className="text-red-400" size={20} />
                                <div>
                                    <p className="text-red-400 font-bold text-sm">A380/A388 Fleet Violation</p>
                                    <p className="text-red-400/70 text-xs">This aircraft is restricted. PIREP cannot be approved.</p>
                                </div>
                            </div>
                        )}

                        {selectedPirep.comments && (
                            <div className="mb-6">
                                <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <MessageSquare size={12} /> Pilot Comments
                                </p>
                                <div className="bg-white/5 border border-white/[0.08] rounded-lg p-4 text-sm text-gray-300 italic">
                                    "{selectedPirep.comments}"
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="block text-xs text-gray-500 uppercase">Admin Verdict & Comments</label>
                            <textarea
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.currentTarget.value)}
                                className="w-full bg-[#111] border border-white/[0.08] rounded-xl p-4 text-white focus:border-accent-gold outline-none h-24 text-sm"
                                placeholder="Reason for approval/rejection..."
                            />
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleReview(selectedPirep._id, 1)}
                                    disabled={processing || isA380(selectedPirep.aircraft_type)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isA380(selectedPirep.aircraft_type) ? 'A380 aircraft is restricted — cannot approve' : ''}
                                >
                                    <CheckCircle size={18} /> APPROVE
                                </button>
                                <button
                                    onClick={() => handleReview(selectedPirep._id, 2)}
                                    disabled={processing}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} /> REJECT
                                </button>
                                <button
                                    onClick={() => setSelectedPirep(null)}
                                    disabled={processing}
                                    className="px-6 py-3 bg-[#111] text-gray-400 hover:text-white rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedPirep._id)}
                                    disabled={processing}
                                    className="px-6 py-3 bg-red-700 text-white hover:bg-red-800 rounded-xl transition-all flex items-center gap-2"
                                    title="Permanently delete this PIREP and reverse credits"
                                >
                                    <Trash2 size={16} /> DELETE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Lightbox */}
            {lightboxImg && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md" onClick={() => setLightboxImg(null)}>
                    <button onClick={() => setLightboxImg(null)} className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl font-bold">&times;</button>
                    <img src={lightboxImg} alt="Flight Proof" className="max-w-full max-h-full rounded-xl shadow-2xl border border-white/[0.08] object-contain" />
                </div>
            )}
        </div>
    );
}
