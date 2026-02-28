'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Calendar, Award, X, Sparkles, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DOTM {
    _id: string;
    airport_icao: string;
    month: string;
    year: number;
    bonus_points: number;
    description: string;
    banner_image?: string;
    is_active: boolean;
    created_at: string;
}

const DEFAULT_DESC = 'Pilot fly in/out of this airport will get 1000 Cr in your balance!!';

export default function AdminDOTMPage() {
    const [dotms, setDotms] = useState<DOTM[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [icao, setIcao] = useState('');
    const [bonusPoints, setBonusPoints] = useState(1000);
    const [description, setDescription] = useState(DEFAULT_DESC);
    const [bannerImage, setBannerImage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchDotms(); }, []);

    const fetchDotms = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/dotm');
            const data = await res.json();
            if (res.ok) setDotms(data.dotms || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');
            formData.append('name', `dotm_${icao || 'banner'}`);

            const res = await fetch('/api/cloudinary/store-upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                setBannerImage(data.url);
            } else {
                setError(data.error || 'Image upload failed');
            }
        } catch {
            setError('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/dotm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    icao: icao.toUpperCase(),
                    bonus_points: Number(bonusPoints),
                    description,
                    banner_image: bannerImage,
                    is_active: true,
                })
            });
            if (res.ok) {
                setIcao(''); setBonusPoints(1000); setDescription(DEFAULT_DESC);
                setBannerImage(''); setImagePreview(null);
                setShowForm(false);
                fetchDotms();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create DOTM');
            }
        } catch { setError('Connection error'); }
        finally { setSaving(false); }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            const res = await fetch('/api/admin/dotm', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, updates: { is_active: !currentState } })
            });
            if (res.ok) fetchDotms();
        } catch { /* silent */ }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this destination?')) return;
        try {
            const res = await fetch(`/api/admin/dotm?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchDotms();
        } catch { /* silent */ }
    };

    const activeDotm = dotms.find(d => d.is_active);
    const inputCls = "w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none transition-colors";

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-accent-gold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Destination of the Month</h1>
                        <p className="text-gray-500 text-xs">Featured destinations & bonus credits</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Destination
                </button>
            </div>

            {/* Active DOTM Hero */}
            {activeDotm && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="relative bg-[#0a0a0a] border border-accent-gold/20 rounded-2xl overflow-hidden"
                >
                    {activeDotm.banner_image && (
                        <div className="absolute inset-0">
                            <img src={activeDotm.banner_image} alt="" className="w-full h-full object-cover opacity-20" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/[0.04] to-transparent" />
                    <div className="relative p-6 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                            <span className="text-2xl font-black text-accent-gold font-mono">{activeDotm.airport_icao}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
                                <span className="text-[10px] text-accent-gold font-bold uppercase tracking-widest">Currently Active — {activeDotm.month} {activeDotm.year}</span>
                            </div>
                            <p className="text-white text-sm">{activeDotm.description || 'No description'}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-emerald-400 font-mono font-bold text-sm flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5" /> +{activeDotm.bonus_points} cr
                                </span>
                                <span className="text-gray-600 text-xs">Since {new Date(activeDotm.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Create Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0a0a0a] border border-accent-gold/20 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Add New Destination</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">ICAO Code *</label>
                                        <input type="text" maxLength={4} placeholder="KJFK" value={icao} onChange={(e) => setIcao(e.target.value)} required
                                            className={`${inputCls} uppercase`} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Bonus Credits</label>
                                        <input type="number" min="0" step="100" value={bonusPoints} onChange={(e) => setBonusPoints(Number(e.target.value))} required
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Description</label>
                                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={DEFAULT_DESC}
                                            className={inputCls} />
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Banner Image</label>
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    <div className="flex items-center gap-4">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                            className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border border-white/[0.08] rounded-xl text-sm text-gray-400 hover:border-accent-gold/30 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                            {uploading ? 'Uploading...' : 'Choose Image'}
                                        </button>
                                        {(imagePreview || bannerImage) && (
                                            <div className="relative group">
                                                <img src={imagePreview || bannerImage} alt="Preview" className="h-12 w-20 object-cover rounded-lg border border-white/[0.08]" />
                                                <button type="button" onClick={() => { setBannerImage(''); setImagePreview(null); }}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        )}
                                        {bannerImage && <span className="text-[10px] text-emerald-400 font-mono">Uploaded</span>}
                                    </div>
                                </div>

                                <button type="submit" disabled={saving || uploading}
                                    className="w-full md:w-auto bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {saving ? 'Creating...' : 'Create & Announce'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* History Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">History</h2>
                    <span className="ml-auto text-[10px] text-gray-600 font-mono">{dotms.length} destinations</span>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent-gold" />
                        <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Loading...</p>
                    </div>
                ) : dotms.length === 0 ? (
                    <div className="p-12 text-center">
                        <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                        <p className="text-gray-500">No destinations configured yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.03]">
                        {dotms.map((dotm) => (
                            <div key={dotm._id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                                <div className="flex items-center gap-4">
                                    {dotm.banner_image ? (
                                        <img src={dotm.banner_image} alt="" className={`w-14 h-14 rounded-xl object-cover border transition-all ${
                                            dotm.is_active ? 'border-accent-gold/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'border-white/[0.06]'
                                        }`} />
                                    ) : (
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                                            dotm.is_active 
                                                ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
                                                : 'bg-white/[0.02] text-gray-500 border-white/[0.06]'
                                        }`}>
                                            {dotm.airport_icao}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white text-sm font-bold font-mono">{dotm.airport_icao}</span>
                                            <span className="text-gray-600 text-[10px] font-mono">{dotm.month} {dotm.year}</span>
                                            {dotm.is_active && (
                                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">Active</span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-xs mt-0.5 max-w-md truncate">{dotm.description || 'No description'}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                                                <Award className="w-3 h-3" /> +{dotm.bonus_points} cr
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-mono">
                                                {new Date(dotm.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleActive(dotm._id, dotm.is_active)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            dotm.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-white/5 hover:text-white'
                                        }`}
                                        title={dotm.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {dotm.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dotm._id)}
                                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
