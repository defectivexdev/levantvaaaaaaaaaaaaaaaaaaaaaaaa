'use client';

import { useState, useEffect } from 'react';
import { 
    FileText, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Search, 
    Filter, 
    Loader2, 
    ArrowRight,
    PlaneTakeoff,
    PlaneLanding,
    Calendar,
    User,
    Activity
} from 'lucide-react';

interface FlightReport {
    _id: string;
    pilot_id: string;
    callsign: string;
    departure_icao: string;
    arrival_icao: string;
    aircraft_type: string;
    flight_time: number;
    landing_rate: number;
    fuel_used: number;
    distance: number;
    status: 'Pending' | 'Accepted' | 'Rejected';
    submitted_at: string;
}

export default function AdminReportsPage() {
    const [reports, setReports] = useState<FlightReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Pending');
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/reports?status=${filterStatus}`);
            const data = await res.json();
            if (res.ok) {
                setReports(data.flights || []);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filterStatus]);

    const handleAudit = async (flightId: string, status: 'Accepted' | 'Rejected') => {
        setProcessing(flightId);
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flightId, status }),
            });

            if (res.ok) {
                setReports(prev => prev.filter(r => r._id !== flightId));
            }
        } catch (error) {
            console.error('Audit failed:', error);
        } finally {
            setProcessing(null);
        }
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-accent-gold" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Audit PIREPs</h1>
                        <p className="text-gray-400">Review and moderate pilot flight reports</p>
                    </div>
                </div>

                <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-white/[0.06]">
                    {['Pending', 'Accepted', 'Rejected'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                                filterStatus === s 
                                    ? 'bg-accent-gold text-dark-900' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-gold" />
                    Loading reports...
                </div>
            ) : reports.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No {filterStatus.toLowerCase()} reports to review.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div key={report._id} className="glass-card p-6 flex flex-col lg:flex-row gap-6 hover:border-accent-gold/20 transition-all border border-white/[0.06]">
                            {/* Flight Header Info */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-accent-gold/10 rounded text-accent-gold font-mono font-bold text-lg">
                                            {report.callsign}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{report.aircraft_type}</p>
                                            <p className="text-gray-500 text-xs flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(report.submitted_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-accent-gold font-mono text-xl font-bold">
                                            {report.departure_icao} <ArrowRight className="inline w-4 h-4 text-gray-600 mx-2" /> {report.arrival_icao}
                                        </p>
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Route</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-[#111]/50 p-3 rounded-lg border border-white/[0.06]">
                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Duration</p>
                                        <p className="text-white font-mono">{formatDuration(report.flight_time)}</p>
                                    </div>
                                    <div className="bg-[#111]/50 p-3 rounded-lg border border-white/[0.06]">
                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Landing Rate</p>
                                        <p className={`font-mono ${
                                            report.landing_rate > -150 ? 'text-green-400' : 
                                            report.landing_rate > -300 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                            {report.landing_rate} <span className="text-[10px] opacity-60">fpm</span>
                                        </p>
                                    </div>
                                    <div className="bg-[#111]/50 p-3 rounded-lg border border-white/[0.06]">
                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Distance</p>
                                        <p className="text-white font-mono">{Math.round(report.distance)} <span className="text-[10px] opacity-60">nm</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Area */}
                            {filterStatus === 'Pending' && (
                                <div className="lg:w-48 flex lg:flex-col gap-2 justify-center border-t lg:border-t-0 lg:border-l border-white/[0.06] pt-4 lg:pt-0 lg:pl-6">
                                    <button
                                        onClick={() => handleAudit(report._id, 'Accepted')}
                                        disabled={processing === report._id}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {processing === report._id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                Approve
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleAudit(report._id, 'Rejected')}
                                        disabled={processing === report._id}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
