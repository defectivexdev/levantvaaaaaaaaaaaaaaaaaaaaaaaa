'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, CheckCircle, ArrowRight, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
    _id: string;
    title: string;
    description: string;
    banner_image: string;
    type: string;
    start_time: string;
    end_time: string;
    airports: string[];
    slots_available: number;
    booking_status: 'booked' | 'completed' | 'cancelled' | null;
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/portal/events');
            const data = await res.json();
            if (data.events) setEvents(data.events);
        } catch (error) {
            console.error('Failed to load events', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleJoin = async (event: Event) => {
        if (joiningId) return;
        setJoiningId(event._id);

        try {
            const res = await fetch(`/api/portal/events/${event._id}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Default booking
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Event Booked!', { description: 'See you on the radar.' });
                fetchEvents();
            } else {
                toast.error(data.error || 'Failed to join');
            }
        } catch (error) {
            toast.error('Connection error');
        } finally {
            setJoiningId(null);
        }
    };

    const handleCancel = async (event: Event) => {
        if (!confirm('Cancel your booking?')) return;
        setJoiningId(event._id); // Re-use loading state

        try {
            const res = await fetch(`/api/portal/events/${event._id}/book`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Booking cancelled');
                fetchEvents();
            }
        } catch (error) {
            toast.error('Failed to cancel');
        } finally {
            setJoiningId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Events Calendar</h1>
                <p className="text-gray-500 text-xs mt-0.5">Official group flights, fly-ins, and competitions</p>
            </div>

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-72 bg-[#0a0a0a] rounded-2xl border border-white/[0.06]" />)}
                </div>
            ) : (
                <div className="grid gap-6">
                    {events.map((event) => (
                        <div key={event._id} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden group">
                            <Link href={`/portal/events/${event._id}`} className="block">
                                <div className="h-48 md:h-64 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
                                    
                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded border uppercase tracking-wider mb-2 inline-block ${
                                                    event.type === 'real_ops' ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                }`}>
                                                    {event.type}
                                                </span>
                                                <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4 text-accent-gold" />
                                                        {formatDate(event.start_time)}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4 text-accent-gold" />
                                                        {event.airports.join(' ↔ ')}
                                                    </div>
                                                </div>
                                            </div>

                                            {event.booking_status === 'booked' ? (
                                                <div className="bg-green-500 text-dark-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-500/20">
                                                    <CheckCircle className="w-5 h-5" />
                                                    Booked
                                                </div>
                                            ) : (
                                               <div />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>

                            <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1 text-gray-400 text-sm">
                                    {event.description}
                                </div>
                                <div className="shrink-0 w-full md:w-auto">
                                    {event.booking_status === 'booked' ? (
                                        <button 
                                            onClick={() => handleCancel(event)}
                                            disabled={joiningId === event._id}
                                            className="w-full md:w-auto border border-red-500/30 text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-lg font-bold transition-all"
                                        >
                                            {joiningId === event._id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Cancel Booking'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleJoin(event)}
                                            disabled={joiningId === event._id}
                                            className="w-full md:w-auto bg-accent-gold text-dark-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg hover:shadow-accent-gold/20 flex items-center justify-center gap-2"
                                        >
                                            {joiningId === event._id ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    Book Flight <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No upcoming events on the radar. Check back soon.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
