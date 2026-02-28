'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface EventDetail {
    _id: string;
    title: string;
    description: string;
    banner_image?: string;
    banner?: string;
    type?: string;
    start_time?: string;
    end_time?: string;
    start_datetime?: string;
    end_datetime?: string;
    airports?: string[];
    slots_available?: number;
    is_active: boolean;
}

type BookingStatus = 'booked' | 'attended' | 'cancelled' | null;

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [bookingStatus, setBookingStatus] = useState<BookingStatus>(null);
    const [joining, setJoining] = useState(false);

    const bannerUrl = useMemo(() => {
        if (!event) return '/img/events/default.jpg';
        return event.banner_image || event.banner || '/img/events/default.jpg';
    }, [event]);

    const startIso = event?.start_time || event?.start_datetime;
    const endIso = event?.end_time || event?.end_datetime;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        });
    };

    const fetchEvent = async () => {
        try {
            const res = await fetch(`/api/portal/events/${eventId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load event');

            setEvent(data.event);
            setBookingStatus(data.booking_status ?? null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to load event');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!eventId) return;
        fetchEvent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const handleJoin = async () => {
        if (!event) return;
        if (joining) return;
        setJoining(true);
        try {
            const res = await fetch(`/api/portal/events/${event._id}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to book');

            toast.success('Event Booked!', { description: 'See you on the radar.' });
            await fetchEvent();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to book');
        } finally {
            setJoining(false);
        }
    };

    const handleCancel = async () => {
        if (!event) return;
        if (!confirm('Cancel your booking?')) return;
        if (joining) return;
        setJoining(true);
        try {
            const res = await fetch(`/api/portal/events/${event._id}/book`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to cancel');

            toast.success('Booking cancelled');
            await fetchEvent();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to cancel');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="animate-spin w-12 h-12 text-accent-gold" />
            </div>
        );
    }

    if (!event) {
        return <div className="p-12 text-center text-red-500">Event not found</div>;
    }

    return (
        <div className="space-y-8">
            <Link href="/portal/events" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Events
            </Link>

            <div className="relative h-80 rounded-3xl overflow-hidden border-2 border-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg bg-blue-500/30 text-blue-200 border border-blue-500/30">
                            {event.type || 'Event'}
                        </span>

                        {bookingStatus === 'booked' && (
                            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 backdrop-blur-md shadow-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Booked
                            </span>
                        )}
                    </div>

                    <h1 className="text-5xl font-black text-white mb-3">{event.title}</h1>
                    <p className="text-gray-200 text-lg max-w-3xl">{event.description}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <div className="bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl p-6 space-y-5">
                        <h3 className="text-lg font-bold text-white">Event Info</h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400 text-sm">Start</span>
                                <span className="text-white font-bold text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-accent-gold" />
                                    {formatDate(startIso)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400 text-sm">End</span>
                                <span className="text-white font-bold text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-accent-gold" />
                                    {formatDate(endIso)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400 text-sm">Airports</span>
                                <span className="text-white font-bold text-sm flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-accent-gold" />
                                    {(event.airports && event.airports.length > 0) ? event.airports.join(' ↔ ') : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400 text-sm">Slots</span>
                                <span className="text-white font-bold text-sm">
                                    {event.slots_available === 0 ? 'Unlimited' : `${event.slots_available} Slots`}
                                </span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/[0.08]">
                            {bookingStatus === 'booked' ? (
                                <button
                                    onClick={handleCancel}
                                    disabled={joining}
                                    className="w-full border border-red-500/30 text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-lg font-bold transition-all"
                                >
                                    {joining ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Cancel Booking'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="w-full bg-accent-gold text-dark-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg hover:shadow-accent-gold/20"
                                >
                                    {joining ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Book Flight'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl p-8">
                    <h3 className="text-2xl font-black text-white mb-4">Briefing</h3>
                    <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {event.description}
                    </div>
                </div>
            </div>
        </div>
    );
}
