'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Save, Clock, Plane, MapPin, User } from 'lucide-react';

interface Pirep {
    _id: string;
    flight_number: string;
    callsign: string;
    pilot_id: string;
    departure_icao: string;
    arrival_icao: string;
    alternate_icao?: string;
    route?: string;
    aircraft?: string;
    comments?: string;
    admin_comments?: string;
    approved_status: number;
    duration?: string;
    distance?: number;
    fuel?: number;
    pax?: number;
    cargo?: number;
    departure_time?: string;
    arrival_time?: string;
    landing_rate?: number;
    score?: number;
    flight_type?: string;
    created_at: string;
    date?: string;
}

export default function EditPirepPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [pirep, setPirep] = useState<Pirep | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        flight_number: '',
        departure_icao: '',
        arrival_icao: '',
        alternate_icao: '',
        route: '',
        aircraft: '',
        comments: '',
        admin_comments: '',
        approved_status: 0
    });

    useEffect(() => {
        fetchPirep();
    }, [id]);

    const fetchPirep = async () => {
        try {
            const res = await fetch(`/api/admin/pireps/${id}`);
            const data = await res.json();
            if (data.pirep) {
                setPirep(data.pirep);
                setFormData({
                    flight_number: data.pirep.flight_number || '',
                    departure_icao: data.pirep.departure_icao || '',
                    arrival_icao: data.pirep.arrival_icao || '',
                    alternate_icao: data.pirep.alternate_icao || '',
                    route: data.pirep.route || '',
                    aircraft: data.pirep.aircraft || '',
                    comments: data.pirep.comments || '',
                    admin_comments: data.pirep.admin_comments || '',
                    approved_status: data.pirep.approved_status || 0
                });
            }
        } catch (err) {
            console.error('Error fetching PIREP:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/pireps/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'PIREP updated successfully' });
                fetchPirep();
            } else {
                setMessage({ type: 'error', text: 'Failed to update PIREP' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update PIREP' });
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="px-3 py-1 rounded text-sm bg-yellow-500/20 text-yellow-400">Pending Approval</span>;
            case 1: return <span className="px-3 py-1 rounded text-sm bg-green-500/20 text-green-400">Approved</span>;
            case 2: return <span className="px-3 py-1 rounded text-sm bg-red-500/20 text-red-400">Denied</span>;
            default: return <span className="px-3 py-1 rounded text-sm bg-gray-500/20 text-gray-400">Unknown</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!pirep) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="glass-card p-8 text-center">
                    <p className="text-gray-400">PIREP not found</p>
                    <Link href="/portal/admin/pireps" className="text-accent-gold hover:underline mt-4 inline-block">
                        ← Back to PIREP List
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-accent-gold" />
                        Edit Flight Report - {pirep.flight_number}
                    </h1>
                </div>
                <Link
                    href="/portal/admin/pireps"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to PIREP List
                </Link>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Flight Details (Read-only) */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Plane className="w-5 h-5 text-accent-gold" />
                            Flight Details
                        </h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                {getStatusBadge(pirep.approved_status)}
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Pilot ID</span>
                                <span className="text-accent-gold font-mono">{pirep.callsign}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Date Filed</span>
                                <span className="text-white">{new Date(pirep.created_at).toLocaleDateString()}</span>
                            </div>
                            {pirep.date && (
                                <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                    <span className="text-gray-500">Date Flown</span>
                                    <span className="text-white">{new Date(pirep.date).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Distance</span>
                                <span className="text-white">{pirep.distance || 0} nm</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Duration</span>
                                <span className="text-white">{pirep.duration || '-'}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">PAX</span>
                                <span className="text-white">{pirep.pax || 0}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Cargo</span>
                                <span className="text-white">{pirep.cargo || 0} kg</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Landing Rate</span>
                                <span className={pirep.landing_rate && pirep.landing_rate > -200 ? 'text-green-400' : 'text-yellow-400'}>
                                    {pirep.landing_rate ? `${pirep.landing_rate} fpm` : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.06] pt-3">
                                <span className="text-gray-500">Score</span>
                                <span className="text-white">{pirep.score || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Edit Flight</h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Flight Number*</label>
                                <input
                                    type="text"
                                    value={formData.flight_number}
                                    onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Aircraft*</label>
                                <input
                                    type="text"
                                    value={formData.aircraft}
                                    onChange={(e) => setFormData({ ...formData, aircraft: e.target.value })}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Departure ICAO*</label>
                                <input
                                    type="text"
                                    value={formData.departure_icao}
                                    onChange={(e) => setFormData({ ...formData, departure_icao: e.target.value.toUpperCase() })}
                                    maxLength={4}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Arrival ICAO*</label>
                                <input
                                    type="text"
                                    value={formData.arrival_icao}
                                    onChange={(e) => setFormData({ ...formData, arrival_icao: e.target.value.toUpperCase() })}
                                    maxLength={4}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Alternate ICAO</label>
                                <input
                                    type="text"
                                    value={formData.alternate_icao}
                                    onChange={(e) => setFormData({ ...formData, alternate_icao: e.target.value.toUpperCase() })}
                                    maxLength={4}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-gray-400 text-sm mb-1">Route</label>
                            <textarea
                                value={formData.route}
                                onChange={(e) => setFormData({ ...formData, route: e.target.value.toUpperCase() })}
                                rows={3}
                                className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white font-mono text-sm"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-gray-400 text-sm mb-1">Pilot Comments</label>
                            <textarea
                                value={formData.comments}
                                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                                rows={3}
                                className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comments appear publicly.</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                            <label className="block text-gray-400 text-sm mb-2">Review Status</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={0}
                                        checked={formData.approved_status === 0}
                                        onChange={() => setFormData({ ...formData, approved_status: 0 })}
                                        className="accent-yellow-500"
                                    />
                                    <span className="text-yellow-400">Pending</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={1}
                                        checked={formData.approved_status === 1}
                                        onChange={() => setFormData({ ...formData, approved_status: 1 })}
                                        className="accent-green-500"
                                    />
                                    <span className="text-green-400">Approved</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={2}
                                        checked={formData.approved_status === 2}
                                        onChange={() => setFormData({ ...formData, approved_status: 2 })}
                                        className="accent-red-500"
                                    />
                                    <span className="text-red-400">Denied</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-gray-400 text-sm mb-1">Admin Review Comments</label>
                            <textarea
                                value={formData.admin_comments}
                                onChange={(e) => setFormData({ ...formData, admin_comments: e.target.value })}
                                rows={3}
                                className="w-full bg-[#111] border border-white/[0.08] rounded px-3 py-2 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comments will be emailed to the pilot and visible only to them on the report.</p>
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-6 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
