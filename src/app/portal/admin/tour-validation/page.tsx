'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit, Eye, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';

interface TourReportLeg {
    leg_number: number;
    departure_icao: string;
    arrival_icao: string;
    flight_id?: string;
    pirep_id?: string;
    completed: boolean;
    flight_date?: string;
}

interface TourReport {
    _id: string;
    tour_name: string;
    pilot_name: string;
    pilot_id: string;
    legs: TourReportLeg[];
    status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsModification';
    submitted_at: string;
    reviewed_at?: string;
    reviewer_name?: string;
    admin_notes?: string;
    modification_notes?: string;
    total_legs: number;
    completed_legs: number;
}

export default function TourValidationPage() {
    const [reports, setReports] = useState<TourReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('Pending');
    const [selectedReport, setSelectedReport] = useState<TourReport | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [action, setAction] = useState<'approve' | 'modify' | 'reject' | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [modificationNotes, setModificationNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [flights, setFlights] = useState<any[]>([]);
    const [loadingFlights, setLoadingFlights] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/tour-reports?status=${filter}`);
            const data = await res.json();
            setReports(data.reports || []);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [filter]);

    const openReview = (report: TourReport) => {
        setSelectedReport(report);
        setAdminNotes('');
        setModificationNotes('');
        setAction(null);
        setShowModal(true);
    };

    const fetchFlightDetails = async (pilotId: string, dep: string, arr: string) => {
        setLoadingFlights(true);
        try {
            const res = await fetch('/api/admin/tour-reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pilotId, departureIcao: dep, arrivalIcao: arr }),
            });
            const data = await res.json();
            setFlights(data.flights || []);
        } catch (error) {
            console.error('Failed to fetch flights:', error);
        } finally {
            setLoadingFlights(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReport || !action) return;

        if (action === 'reject' && !adminNotes.trim()) {
            toast.error('Admin notes are required for rejection');
            return;
        }

        if (action === 'modify' && !modificationNotes.trim()) {
            toast.error('Modification notes are required');
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch('/api/admin/tour-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: selectedReport._id,
                    action,
                    adminNotes: adminNotes || undefined,
                    modificationNotes: modificationNotes || undefined,
                }),
            });

            if (res.ok) {
                setShowModal(false);
                toast.success('Report updated successfully');
                fetchReports();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to process report');
            }
        } catch (error) {
            console.error('Failed to process report:', error);
            toast.error('Network error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-accent-gold" />
                    <h1 className="text-2xl font-bold text-white">Tour Validation</h1>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {['Pending', 'Approved', 'Rejected', 'NeedsModification'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            filter === status
                                ? 'bg-accent-gold text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {status === 'NeedsModification' ? 'Needs Modification' : status}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">Loading...</div>
            ) : reports.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No {filter.toLowerCase()} reports</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#111]">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-medium">Pilot</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Tour</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Legs</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Submitted</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report._id} className="border-t border-white/[0.06] hover:bg-white/5">
                                    <td className="p-4 text-white">{report.pilot_name}</td>
                                    <td className="p-4 text-white">{report.tour_name}</td>
                                    <td className="p-4">
                                        <span className={`text-sm ${
                                            report.completed_legs === report.total_legs
                                                ? 'text-green-400'
                                                : 'text-yellow-400'
                                        }`}>
                                            {report.completed_legs}/{report.total_legs}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {new Date(report.submitted_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded uppercase ${
                                            report.status === 'Approved' ? 'bg-green-500/30 text-green-300' :
                                            report.status === 'Rejected' ? 'bg-red-500/30 text-red-300' :
                                            report.status === 'NeedsModification' ? 'bg-yellow-500/30 text-yellow-300' :
                                            'bg-blue-500/30 text-blue-300'
                                        }`}>
                                            {report.status === 'NeedsModification' ? 'Needs Mod' : report.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => openReview(report)}
                                            className="text-blue-400 hover:text-blue-300 p-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Review Modal */}
            {showModal && selectedReport && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[#0a0a0a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 p-6 z-10">
                            <h2 className="text-xl font-bold text-white">Review Tour Report</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {selectedReport.pilot_name} - {selectedReport.tour_name}
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Legs Review */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Tour Legs</h3>
                                <div className="space-y-2">
                                    {selectedReport.legs.map((leg) => (
                                        <div
                                            key={leg.leg_number}
                                            className={`flex items-center justify-between p-4 rounded-lg ${
                                                leg.completed ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-400 font-mono">#{leg.leg_number}</span>
                                                <span className="text-white font-mono font-bold">
                                                    {leg.departure_icao} → {leg.arrival_icao}
                                                </span>
                                                {leg.flight_date && (
                                                    <span className="text-gray-400 text-sm">
                                                        {new Date(leg.flight_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {leg.completed ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                                <button
                                                    onClick={() => fetchFlightDetails(selectedReport.pilot_id, leg.departure_icao, leg.arrival_icao)}
                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                >
                                                    View Flights
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Flight Details */}
                            {loadingFlights && (
                                <div className="text-center text-gray-400 py-4">Loading flights...</div>
                            )}
                            {flights.length > 0 && (
                                <div className="bg-white/5 rounded-lg p-4">
                                    <h4 className="text-white font-bold mb-2">Matching Flights</h4>
                                    <div className="space-y-2">
                                        {flights.map((flight) => (
                                            <div key={flight._id} className="text-sm text-gray-300 flex justify-between">
                                                <span>{flight.departure_icao} → {flight.arrival_icao}</span>
                                                <span>{new Date(flight.created_at).toLocaleString()}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${
                                                    flight.status === 'Accepted' ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'
                                                }`}>
                                                    {flight.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Selection */}
                            {selectedReport.status === 'Pending' && (
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4">Review Action</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setAction('approve')}
                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                action === 'approve'
                                                    ? 'border-green-500 bg-green-500/20'
                                                    : 'border-white/10 hover:border-green-500/50'
                                            }`}
                                        >
                                            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                            <p className="text-white font-medium">Approve</p>
                                        </button>
                                        <button
                                            onClick={() => setAction('modify')}
                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                action === 'modify'
                                                    ? 'border-yellow-500 bg-yellow-500/20'
                                                    : 'border-white/10 hover:border-yellow-500/50'
                                            }`}
                                        >
                                            <Edit className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                            <p className="text-white font-medium">Request Changes</p>
                                        </button>
                                        <button
                                            onClick={() => setAction('reject')}
                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                action === 'reject'
                                                    ? 'border-red-500 bg-red-500/20'
                                                    : 'border-white/10 hover:border-red-500/50'
                                            }`}
                                        >
                                            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                                            <p className="text-white font-medium">Reject</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {action && (
                                <div className="space-y-4">
                                    {action === 'modify' && (
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Modification Instructions (Required)</label>
                                            <textarea
                                                value={modificationNotes}
                                                onChange={(e) => setModificationNotes(e.target.value)}
                                                rows={4}
                                                placeholder="Explain what needs to be corrected..."
                                                className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">
                                            Admin Notes {action === 'reject' && '(Required)'}
                                        </label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            rows={3}
                                            placeholder="Internal notes..."
                                            className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Previous Review Info */}
                            {selectedReport.status !== 'Pending' && (
                                <div className="bg-white/5 rounded-lg p-4">
                                    <h4 className="text-white font-bold mb-2">Review History</h4>
                                    <div className="space-y-2 text-sm">
                                        <p className="text-gray-300">
                                            <strong>Reviewed by:</strong> {selectedReport.reviewer_name}
                                        </p>
                                        <p className="text-gray-300">
                                            <strong>Date:</strong> {selectedReport.reviewed_at && new Date(selectedReport.reviewed_at).toLocaleString()}
                                        </p>
                                        {selectedReport.admin_notes && (
                                            <p className="text-gray-300">
                                                <strong>Notes:</strong> {selectedReport.admin_notes}
                                            </p>
                                        )}
                                        {selectedReport.modification_notes && (
                                            <p className="text-yellow-400">
                                                <strong>Modifications Requested:</strong> {selectedReport.modification_notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 text-gray-400 hover:text-white"
                            >
                                Close
                            </button>
                            {selectedReport.status === 'Pending' && action && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={processing}
                                    className="btn-primary px-6 py-2 disabled:opacity-50"
                                >
                                    {processing ? 'Processing...' : `${action.charAt(0).toUpperCase() + action.slice(1)} Report`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
