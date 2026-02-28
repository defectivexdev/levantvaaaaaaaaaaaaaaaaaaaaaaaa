'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Plane, MapPin, Clock, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface LegDetailProps {
    legId: string;
}

export default function ActivityLegDetail({ legId }: LegDetailProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingStatus, setBookingStatus] = useState<string | null>(null);
    const [bookingMessage, setBookingMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchLeg();
    }, [legId]);

    const fetchLeg = async () => {
        try {
            const res = await fetch(`/api/activities/leg/${legId}`);
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching leg:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDispatch = async () => {
        setBookingStatus('loading');
        try {
            const res = await fetch('/api/dispatch/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    departure_icao: data.leg.departure_icao,
                    arrival_icao: data.leg.arrival_icao,
                    flight_number: data.leg.flight_number,
                    aircraft: data.leg.aircraft,
                    activity_id: data.activity._id,
                    activity_leg_id: legId,
                })
            });
            
            if (res.ok) {
                setBookingStatus('success');
                setBookingMessage('Flight booked successfully! Visit Dispatch Center for briefing.');
            } else {
                const error = await res.json();
                setBookingStatus('error');
                setBookingMessage(error.message || 'Failed to book flight');
            }
        } catch (err) {
            setBookingStatus('error');
            setBookingMessage('Failed to book flight. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!data || !data.leg) {
        return <div className="text-center text-gray-400 py-12">Leg not found</div>;
    }

    const { leg, activity, bookingStatus: status } = data;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Status Messages */}
            {bookingStatus === 'success' && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Check className="w-5 h-5" />
                    {bookingMessage}
                    <Link href="/portal/dispatch" className="ml-auto bg-green-500 text-white px-4 py-1 rounded text-sm font-medium hover:bg-green-600 transition-colors">
                        Dispatch Center
                    </Link>
                </div>
            )}
            {bookingStatus === 'error' && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    {bookingMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href={`/portal/activities/${activity._id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to {activity.type.toLowerCase()}
                </Link>
                
                {/* Dispatch Button */}
                <div>
                    {status.isLegComplete ? (
                        <button disabled className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Leg Completed
                        </button>
                    ) : status.hasActiveBid ? (
                        <div className="text-right">
                            <button disabled className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Dispatch Flight
                            </button>
                            <p className="text-xs text-gray-400 mt-1">
                                You have a booked flight. Visit <Link href="/portal/dispatch" className="text-accent-gold hover:underline">dispatch</Link>.
                            </p>
                        </div>
                    ) : status.canBook ? (
                        <button 
                            onClick={handleDispatch}
                            disabled={bookingStatus === 'loading'}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <Plane className="w-4 h-4" />
                            {bookingStatus === 'loading' ? 'Booking...' : 'Dispatch Flight'}
                        </button>
                    ) : (
                        <div className="text-right">
                            <button disabled className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Cannot Dispatch
                            </button>
                            <p className="text-xs text-gray-400 mt-1">Check tour/event is active and legs flown in order.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Route Header */}
            <div className="glass-card p-6">
                <h1 className="text-2xl font-bold text-white mb-2">
                    {leg.departure_icao || 'Any'} → {leg.arrival_icao || 'Any'}
                </h1>
                <p className="text-gray-400">
                    {activity.title} - Leg {leg.leg_number}
                </p>
            </div>

            {/* Leg Details */}
            <div className="glass-card p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent-gold" />
                    Leg Details
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Flight Number</span>
                            <span className="text-white font-mono">{leg.flight_number || 'Any'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Departure ICAO</span>
                            <span className="text-white font-mono">{leg.departure_icao || 'Any'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Arrival ICAO</span>
                            <span className="text-white font-mono">{leg.arrival_icao || 'Any'}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Aircraft</span>
                            <span className="text-white">{leg.aircraft || 'Any'}</span>
                        </div>
                        {leg.distance_nm && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Distance (approx)</span>
                                <span className="text-white">{leg.distance_nm} nm</span>
                            </div>
                        )}
                        {leg.route && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Route</span>
                                <span className="text-white font-mono text-xs">{leg.route}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Map placeholder */}
            <div className="glass-card p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent-gold" />
                    Route Map
                </h3>
                <div className="h-80 bg-[#111] rounded-lg flex items-center justify-center text-gray-500">
                    Map visualization coming soon
                </div>
            </div>
        </div>
    );
}
