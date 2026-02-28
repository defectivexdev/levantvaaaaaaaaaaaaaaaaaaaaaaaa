'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Trash2, Edit, X, Save, RefreshCw } from 'lucide-react';

interface Report {
    _id: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    aircraft_type: string;
    submitted_at: string;
    flight_time: number;
    landing_rate: number;
    status: string;
}

const statusStyles: Record<string, string> = {
    'Accepted': 'bg-green-500/20 text-green-400',
    'Pending': 'bg-yellow-500/20 text-yellow-400',
    'Rejected': 'bg-red-500/20 text-red-400',
};

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [newComments, setNewComments] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this PIREP? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/portal/reports/detail?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setReports(prev => prev.filter(r => r._id !== id));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete PIREP');
            }
        } catch (error) {
            alert('Error deleting PIREP');
        }
    };

    const handleEditSave = async () => {
        if (!editingReport) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/portal/reports/detail`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingReport._id, comments: newComments })
            });
            if (res.ok) {
                setReports(prev => prev.map(r => r._id === editingReport._id ? { ...r, comments: newComments } : r));
                setEditingReport(null);
            } else {
                alert('Failed to save changes');
            }
        } catch (error) {
            alert('Error saving changes');
        } finally {
            setSaving(false);
        }
    };

    const fetchReports = async () => {
        try {
            const sessionRes = await fetch('/api/auth/me');
            const session = await sessionRes.json();
            
            if (session.user?.id) {
                const res = await fetch(`/api/portal/reports/recent?pilotId=${session.user.id}&limit=50`);
                const data = await res.json();
                if (data.flights) {
                    setReports(data.flights);
                }
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number) => {
        if (!minutes) return '-';
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}:${String(mins).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">My Flight Reports</h1>
                <p className="text-gray-500 text-xs mt-0.5">View all your submitted flight reports</p>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-gray-500 text-sm border-b border-white/10 bg-[#0a0a0a]/50">
                                <th className="p-4">Callsign</th>
                                <th className="p-4">Route</th>
                                <th className="p-4">Aircraft</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Landing (fpm)</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        Loading reports...
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        No flight reports found.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr 
                                        key={report._id} 
                                        className="border-b border-white/[0.06] hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => window.location.href = `/portal/reports/${report._id}`}
                                    >
                                        <td className="p-4 text-white font-mono group-hover:text-accent-gold transition-colors">{report.callsign}</td>
                                        <td className="p-4 text-white">
                                            <span className="text-accent-gold">{report.departure_icao}</span>
                                            {' → '}
                                            <span className="text-accent-gold">{report.arrival_icao}</span>
                                        </td>
                                        <td className="p-4 text-gray-400">{report.aircraft_type}</td>
                                        <td className="p-4 text-gray-400">
                                            {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-white">{formatDuration(report.flight_time)}</td>
                                        <td className={`p-4 font-mono ${
                                            report.landing_rate > -150 ? 'text-green-400' : 
                                            report.landing_rate > -200 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                            {report.landing_rate || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setEditingReport(report);
                                                        setNewComments((report as any).comments || '');
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                    title="Edit Comments"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {report.status === 'Pending' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(report._id); }}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                                        title="Delete PIREP"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); window.location.href = `/portal/reports/${report._id}`; }}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-white/5">
                            <h2 className="text-white font-bold flex items-center gap-2">
                                <Edit className="w-4 h-4 text-accent-gold" />
                                Edit PIREP Comments
                            </h2>
                            <button onClick={() => setEditingReport(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Flight</label>
                                <div className="text-xl font-display font-bold text-white">
                                    {editingReport.callsign} ({editingReport.departure_icao} → {editingReport.arrival_icao})
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pilot Comments</label>
                                <textarea 
                                    className="w-full h-32 bg-black/40 border border-white/[0.08] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-accent-gold/50 transition-colors"
                                    placeholder="Enter your notes about the flight..."
                                    value={newComments}
                                    onChange={(e) => setNewComments(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 border-t border-white/[0.06] flex justify-end gap-3">
                            <button 
                                onClick={() => setEditingReport(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleEditSave}
                                disabled={saving}
                                className="bg-accent-gold hover:bg-accent-gold/80 text-dark-950 px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                SAVE CHANGES
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
