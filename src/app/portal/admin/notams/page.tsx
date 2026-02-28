'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Bell, Calendar, Megaphone, AlertTriangle, X } from 'lucide-react';

interface Notam {
    _id: string;
    title: string;
    content: string;
    type: 'news' | 'notam' | 'event';
    priority: 'normal' | 'important' | 'urgent';
    author_name: string;
    event_date?: string;
    event_location?: string;
    bonus_credits?: number;
    active: boolean;
    created_at: string;
}

export default function AdminNotamsPage() {
    const [notams, setNotams] = useState<Notam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Notam | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<'news' | 'notam' | 'event'>('news');
    const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [bonusCredits, setBonusCredits] = useState('');

    const fetchNotams = () => {
        setLoading(true);
        fetch('/api/admin/notams')
            .then(res => res.json())
            .then(data => setNotams(data.notams || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchNotams(); }, []);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setType('news');
        setPriority('normal');
        setEventDate('');
        setEventLocation('');
        setBonusCredits('');
        setEditing(null);
    };

    const openNew = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (notam: Notam) => {
        setEditing(notam);
        setTitle(notam.title);
        setContent(notam.content);
        setType(notam.type);
        setPriority(notam.priority);
        setEventDate(notam.event_date ? new Date(notam.event_date).toISOString().slice(0, 16) : '');
        setEventLocation(notam.event_location || '');
        setBonusCredits(notam.bonus_credits?.toString() || '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            alert('Title and content are required');
            return;
        }

        setSaving(true);
        try {
            const body = {
                ...(editing && { id: editing._id }),
                title,
                content,
                type,
                priority,
                eventDate: eventDate || undefined,
                eventLocation: eventLocation || undefined,
                bonusCredits: bonusCredits ? parseInt(bonusCredits) : undefined,
            };

            const res = await fetch('/api/admin/notams', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchNotams();
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        
        await fetch(`/api/admin/notams?id=${id}`, { method: 'DELETE' });
        fetchNotams();
    };

    const toggleActive = async (notam: Notam) => {
        await fetch('/api/admin/notams', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notam._id, active: !notam.active }),
        });
        fetchNotams();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-accent-gold" />
                    <h1 className="text-2xl font-bold text-white">Manage News & NOTAMs</h1>
                </div>
                <button 
                    onClick={openNew}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Post
                </button>
            </div>

            {loading ? (
                <div className="glass-card p-12 text-center text-gray-400">Loading...</div>
            ) : notams.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-400">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No announcements yet</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#111]">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-medium">Title</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Priority</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                                <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notams.map((notam) => (
                                <tr key={notam._id} className="border-t border-white/[0.06] hover:bg-white/5">
                                    <td className="p-4 text-white">{notam.title}</td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded uppercase ${
                                            notam.type === 'event' ? 'bg-purple-500/30 text-purple-300' :
                                            notam.type === 'notam' ? 'bg-yellow-500/30 text-yellow-300' :
                                            'bg-blue-500/30 text-blue-300'
                                        }`}>
                                            {notam.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded uppercase ${
                                            notam.priority === 'urgent' ? 'bg-red-500/30 text-red-300' :
                                            notam.priority === 'important' ? 'bg-yellow-500/30 text-yellow-300' :
                                            'bg-gray-500/30 text-gray-300'
                                        }`}>
                                            {notam.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleActive(notam)}
                                            className={`text-xs px-2 py-1 rounded ${
                                                notam.active 
                                                    ? 'bg-green-500/30 text-green-300' 
                                                    : 'bg-gray-500/30 text-gray-400'
                                            }`}
                                        >
                                            {notam.active ? 'Active' : 'Hidden'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-gray-400">
                                        {new Date(notam.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => openEdit(notam)}
                                            className="text-blue-400 hover:text-blue-300 p-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(notam._id)}
                                            className="text-red-400 hover:text-red-300 p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0a0a] rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">
                                {editing ? 'Edit Post' : 'New Post'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Content</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={5}
                                    className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Type</label>
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value as any)}
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                    >
                                        <option value="news">News</option>
                                        <option value="notam">NOTAM</option>
                                        <option value="event">Event</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={e => setPriority(e.target.value as any)}
                                        className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="important">Important</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            {type === 'event' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Event Date</label>
                                            <input
                                                type="datetime-local"
                                                value={eventDate}
                                                onChange={e => setEventDate(e.target.value)}
                                                className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Bonus Credits</label>
                                            <input
                                                type="number"
                                                value={bonusCredits}
                                                onChange={e => setBonusCredits(e.target.value)}
                                                className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Event Location</label>
                                        <input
                                            type="text"
                                            value={eventLocation}
                                            onChange={e => setEventLocation(e.target.value)}
                                            className="w-full bg-[#111] border border-white/[0.08] rounded px-4 py-3 text-white"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary px-6 py-2 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
