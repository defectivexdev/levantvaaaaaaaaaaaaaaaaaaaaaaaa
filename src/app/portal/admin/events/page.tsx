'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, MapPin, Users, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
    _id: string;
    title: string;
    description: string;
    banner_image: string;
    type: 'Fly-In' | 'Group Flight' | 'Competition' | 'real_ops';
    start_time: string;
    end_time: string;
    airports: string[];
    slots_available: number;
    is_active: boolean;
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        banner_image: '/img/events/default.jpg',
        type: 'Fly-In',
        start_time: '',
        end_time: '',
        airports: [],
        slots_available: 0,
        is_active: true
    });

    // Helper for comma-separated airports
    const [airportInput, setAirportInput] = useState('');

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/admin/events');
            const data = await res.json();
            if (data.events) setEvents(data.events);
        } catch (error) {
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleOpenModal = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            setFormData(event);
            setAirportInput(event.airports.join(', '));
        } else {
            setEditingEvent(null);
            setFormData({
                title: '',
                description: '',
                banner_image: '/img/events/default.jpg',
                type: 'Fly-In',
                start_time: '',
                end_time: '',
                airports: [],
                slots_available: 0,
                is_active: true
            });
            setAirportInput('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const airports = airportInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
            
            const payload = {
                ...formData,
                airports
            };

            const url = editingEvent ? `/api/admin/events/${editingEvent._id}` : '/api/admin/events';
            const method = editingEvent ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(editingEvent ? 'Event updated' : 'Event created');
                setIsModalOpen(false);
                fetchEvents();
            } else {
                toast.error(data.error || 'Failed to save event');
            }
        } catch (error) {
            toast.error('An error occurred');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will delete all bookings associated with this event.')) return;

        try {
            const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Event deleted');
                fetchEvents();
            }
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Event Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-accent-gold text-dark-900 px-4 py-2 rounded-lg font-bold hover:bg-yellow-500"
                >
                    <Plus className="w-5 h-5" />
                    New Event
                </button>
            </div>

            <div className="grid gap-4">
                {events.map((event) => (
                    <div key={event._id} className="glass-card p-6 flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-48 h-32 bg-[#0a0a0a] rounded-lg overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        {event.title}
                                        <span className={`text-xs px-2 py-0.5 rounded border ${
                                            event.type === 'real_ops' ? 'border-purple-500 text-purple-400' : 'border-blue-500 text-blue-400'
                                        }`}>
                                            {event.type}
                                        </span>
                                        {!event.is_active && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded">Draft</span>}
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1 mb-3 line-clamp-2">{event.description}</p>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(event.start_time).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {event.airports.join(', ')}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {event.slots_available === 0 ? 'Unlimited' : `${event.slots_available} Slots`}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(event)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(event._id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#080808]/95 backdrop-blur z-10">
                            <h2 className="text-xl font-bold text-white">{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                    >
                                        <option value="Fly-In">Fly-In</option>
                                        <option value="Group Flight">Group Flight</option>
                                        <option value="Competition">Competition</option>
                                        <option value="real_ops">Real Ops</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Status</label>
                                    <select
                                        value={formData.is_active ? 'true' : 'false'}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                                        className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Draft</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Start Time (UTC)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setFormData({ ...formData, start_time: new Date(e.target.value).toISOString() })}
                                        className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">End Time (UTC)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_time ? new Date(formData.end_time).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setFormData({ ...formData, end_time: new Date(e.target.value).toISOString() })}
                                        className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Airports (Comma separated ICAO)</label>
                                <input
                                    type="text"
                                    value={airportInput}
                                    onChange={(e) => setAirportInput(e.target.value)}
                                    placeholder="EGLL, LFPG, KJFK"
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white font-mono uppercase"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Banner Image</label>

                                <div className="flex flex-col gap-3">
                                    <div className="w-full h-40 bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/[0.08]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formData.banner_image || '/img/events/default.jpg'}
                                            alt="Banner preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold cursor-pointer transition-all border border-white/[0.08] ${
                                            uploadingBanner ? 'opacity-60 pointer-events-none' : 'hover:bg-white/5'
                                        }`}>
                                            <ImageIcon className="w-4 h-4 text-accent-gold" />
                                            <span className="text-sm text-white">Upload Image</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (!file.type.startsWith('image/')) {
                                                        toast.error('Please select an image file');
                                                        return;
                                                    }
                                                    setUploadingBanner(true);
                                                    try {
                                                        const fd = new FormData();
                                                        fd.append('file', file);
                                                        fd.append('name', `${formData.title || 'event'}_banner`);

                                                        const res = await fetch('/api/cloudinary/event-upload', {
                                                            method: 'POST',
                                                            body: fd,
                                                        });
                                                        const data = await res.json();
                                                        if (!res.ok || !data.url) {
                                                            throw new Error(data.error || 'Upload failed');
                                                        }
                                                        setFormData(prev => ({ ...prev, banner_image: data.url }));
                                                        toast.success('Banner uploaded');
                                                    } catch (err: any) {
                                                        toast.error(err?.message || 'Upload failed');
                                                    } finally {
                                                        setUploadingBanner(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>

                                        {uploadingBanner && (
                                            <span className="text-xs text-gray-400">Uploading...</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-2 text-white"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#080808]/95 sticky bottom-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={handleSave} className="bg-accent-gold text-dark-900 px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Save Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
