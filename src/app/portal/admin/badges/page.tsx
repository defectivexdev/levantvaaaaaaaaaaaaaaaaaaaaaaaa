'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Award, Plus, Trash2, Search, User, Loader2, CheckCircle, AlertCircle, X, ChevronDown, Upload, Edit, Image, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Tour', 'Milestone', 'Flight Hours', 'Flights', 'Landings', 'Special', 'Event'];

export default function AwardManagementPage() {
    const [awards, setAwards] = useState<any[]>([]);
    const [pilots, setPilots] = useState<any[]>([]);
    const [pilotAwards, setPilotAwards] = useState<any[]>([]);
    const [tours, setTours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Tabs
    const [tab, setTab] = useState<'awards' | 'assignments'>('awards');

    // Create / Edit form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingAward, setEditingAward] = useState<any>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formCategory, setFormCategory] = useState('Special');
    const [formTourId, setFormTourId] = useState('');
    const [formImagePreview, setFormImagePreview] = useState('');
    const [formImageBase64, setFormImageBase64] = useState('');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Assign form
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [selectedPilot, setSelectedPilot] = useState('');
    const [selectedAward, setSelectedAward] = useState('');
    const [searchPilot, setSearchPilot] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Manual grant by VID
    const [showGrantVid, setShowGrantVid] = useState(false);
    const [grantVid, setGrantVid] = useState('');
    const [grantAwardId, setGrantAwardId] = useState('');
    const [granting, setGranting] = useState(false);

    // Search
    const [searchAward, setSearchAward] = useState('');
    const [searchAssignment, setSearchAssignment] = useState('');

    // Toast
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (message) { const t = setTimeout(() => setMessage(null), 4000); return () => clearTimeout(t); } }, [message]);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/badges');
            const data = await res.json();
            setAwards(data.awards || []);
            setPilots(data.pilots || []);
            setPilotAwards(data.pilotAwards || []);
            setTours(data.tours || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const toast = (type: 'success' | 'error', text: string) => setMessage({ type, text });

    // ── Image handling ──
    const handleImageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) readImageFile(file);
    }, []);

    const readImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setFormImageBase64(result);
            setFormImagePreview(result);
        };
        reader.readAsDataURL(file);
    };

    // ── Create / Edit Award ──
    const resetForm = () => {
        setFormName(''); setFormDesc(''); setFormCategory('Special'); setFormTourId('');
        setFormImagePreview(''); setFormImageBase64(''); setEditingAward(null);
    };

    const openEdit = (award: any) => {
        setEditingAward(award);
        setFormName(award.name);
        setFormDesc(award.description || '');
        setFormCategory(award.category || 'Special');
        setFormTourId(award.linkedTourId?._id || award.linkedTourId || '');
        setFormImagePreview(award.imageUrl || '');
        setFormImageBase64('');
        setShowCreateForm(true);
    };

    const handleSaveAward = async () => {
        if (!formName.trim()) { toast('error', 'Award name is required'); return; }
        setSaving(true);
        try {
            const body: any = {
                name: formName,
                description: formDesc,
                category: formCategory,
                linkedTourId: formTourId || null,
            };
            if (formImageBase64) body.imageBase64 = formImageBase64;

            let res;
            if (editingAward) {
                body.id = editingAward._id;
                res = await fetch('/api/admin/badges', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            } else {
                res = await fetch('/api/admin/badges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            }
            if (res.ok) {
                toast('success', editingAward ? 'Award updated!' : 'Award created!');
                resetForm();
                setShowCreateForm(false);
                fetchData();
            } else {
                const err = await res.json();
                toast('error', err.error || 'Failed');
            }
        } catch { toast('error', 'Save failed'); }
        finally { setSaving(false); }
    };

    // ── Delete Award ──
    const handleDeleteAward = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/badges?awardId=${deleteTarget._id}`, { method: 'DELETE' });
            if (res.ok) { toast('success', 'Award deleted'); fetchData(); }
            else toast('error', 'Delete failed');
        } catch { toast('error', 'Delete failed'); }
        finally { setDeleteTarget(null); }
    };

    // ── Assign ──
    const handleAssign = async () => {
        if (!selectedPilot || !selectedAward) { toast('error', 'Select both pilot and award'); return; }
        setAssigning(true);
        try {
            const res = await fetch('/api/admin/badges', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'assign', pilotId: selectedPilot, awardId: selectedAward })
            });
            if (res.ok) { toast('success', 'Award assigned!'); setSelectedPilot(''); setSelectedAward(''); setShowAssignForm(false); fetchData(); }
            else { const err = await res.json(); toast('error', err.error || 'Failed'); }
        } catch { toast('error', 'Assign failed'); }
        finally { setAssigning(false); }
    };

    const handleRemoveAssignment = async (id: string) => {
        if (!confirm('Remove this award from the pilot?')) return;
        try {
            const res = await fetch(`/api/admin/badges?assignmentId=${id}`, { method: 'DELETE' });
            if (res.ok) { toast('success', 'Assignment removed'); fetchData(); }
        } catch { toast('error', 'Failed'); }
    };

    // ── Manual Grant by VID ──
    const handleGrantByVid = async () => {
        if (!grantVid || !grantAwardId) { toast('error', 'Enter VID and select award'); return; }
        setGranting(true);
        try {
            const res = await fetch('/api/admin/badges', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'grantByVid', vid: grantVid, awardId: grantAwardId })
            });
            const data = await res.json();
            if (res.ok) { toast('success', `Award granted to ${data.pilotName || grantVid}!`); setGrantVid(''); setGrantAwardId(''); setShowGrantVid(false); fetchData(); }
            else toast('error', data.error || 'Failed');
        } catch { toast('error', 'Grant failed'); }
        finally { setGranting(false); }
    };

    // ── Filters ──
    const filteredAwards = awards.filter(a => !searchAward || a.name.toLowerCase().includes(searchAward.toLowerCase()));
    const filteredPilots = pilots.filter(p => `${p.pilot_id} ${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPilot.toLowerCase()));
    const filteredAssignments = pilotAwards.filter(pa => {
        if (!searchAssignment) return true;
        const q = searchAssignment.toLowerCase();
        return `${pa.pilot_id?.pilot_id} ${pa.pilot_id?.first_name} ${pa.pilot_id?.last_name} ${pa.award_id?.name}`.toLowerCase().includes(q);
    });

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-accent-gold animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6" style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                        <Award className="w-5 h-5 text-accent-gold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Award Management</h1>
                        <p className="text-gray-500 text-xs">Create, manage, and assign pilot awards</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { resetForm(); setShowCreateForm(true); }} className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-4 py-2 rounded-xl transition-colors text-sm">
                        <Plus className="w-4 h-4" /> Create Award
                    </button>
                    <button onClick={() => setShowAssignForm(!showAssignForm)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm">
                        <UserPlus className="w-4 h-4" /> Assign
                    </button>
                    <button onClick={() => setShowGrantVid(!showGrantVid)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm">
                        <User className="w-4 h-4" /> Grant by VID
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Awards', value: awards.length, color: 'text-accent-gold' },
                    { label: 'Active', value: awards.filter(a => a.active).length, color: 'text-emerald-400' },
                    { label: 'Assigned', value: pilotAwards.length, color: 'text-blue-400' },
                    { label: 'Pilots with Awards', value: new Set(pilotAwards.map(pa => pa.pilot_id?._id)).size, color: 'text-purple-400' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className={`flex items-center gap-3 p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        {message.text}
                        <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Create / Edit Award Form ── */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0a0a0a] border border-accent-gold/20 rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{editingAward ? 'Edit Award' : 'Create New Award'}</h2>
                                <button onClick={() => { setShowCreateForm(false); resetForm(); }} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="grid md:grid-cols-[1fr_1fr_160px] gap-6">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Award Name</label>
                                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Thailand XM-3272 Tour Finisher"
                                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:border-accent-gold/50 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Description</label>
                                        <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} placeholder="Award details and requirements..."
                                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:border-accent-gold/50 focus:outline-none resize-none" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Category</label>
                                        <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:border-accent-gold/50 focus:outline-none">
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Link to Tour</label>
                                        <select value={formTourId} onChange={e => setFormTourId(e.target.value)}
                                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:border-accent-gold/50 focus:outline-none">
                                            <option value="">None (standalone award)</option>
                                            {tours.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleSaveAward} disabled={saving || !formName.trim()}
                                        className="w-full bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2 mt-2">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        {saving ? 'Saving...' : editingAward ? 'Update Award' : 'Create Award'}
                                    </button>
                                </div>
                                {/* Image Upload Zone */}
                                <div
                                    onDragOver={e => e.preventDefault()} onDrop={handleImageDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-accent-gold/40 rounded-xl cursor-pointer transition-colors p-4 gap-2 min-h-[160px]"
                                >
                                    {formImagePreview ? (
                                        <img src={formImagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_10px_rgba(0,207,213,0.3)]" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-[#080808] border-2 border-dashed border-white/10 flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-gray-600" />
                                        </div>
                                    )}
                                    <span className="text-[9px] text-gray-500 uppercase tracking-wider text-center">Drop image or click to upload</span>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) readImageFile(e.target.files[0]); }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Assign Form ── */}
            <AnimatePresence>
                {showAssignForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Assign Award to Pilot</h2>
                                <button onClick={() => setShowAssignForm(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Pilot</label>
                                    <input type="text" placeholder="Search pilot..." value={searchPilot} onChange={e => setSearchPilot(e.target.value)}
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm mb-2 focus:border-accent-gold/50 focus:outline-none" />
                                    <select value={selectedPilot} onChange={e => setSelectedPilot(e.target.value)}
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:border-accent-gold/50 focus:outline-none">
                                        <option value="">Select pilot...</option>
                                        {filteredPilots.map(p => <option key={p._id} value={p._id}>{p.pilot_id} — {p.first_name} {p.last_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Award</label>
                                    <select value={selectedAward} onChange={e => setSelectedAward(e.target.value)} className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:border-accent-gold/50 focus:outline-none mt-[42px]">
                                        <option value="">Select award...</option>
                                        {awards.filter(a => a.active).map(a => <option key={a._id} value={a._id}>{a.name} ({a.category})</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleAssign} disabled={assigning || !selectedPilot || !selectedAward}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                                        {assigning ? 'Assigning...' : 'Assign'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Grant by VID Form ── */}
            <AnimatePresence>
                {showGrantVid && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0a0a0a] border border-blue-500/20 rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Manual Grant by Pilot VID</h2>
                                <button onClick={() => setShowGrantVid(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Pilot VID</label>
                                    <input type="text" placeholder="e.g. LVT001" value={grantVid} onChange={e => setGrantVid(e.target.value)}
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm focus:border-accent-gold/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Award</label>
                                    <select value={grantAwardId} onChange={e => setGrantAwardId(e.target.value)}
                                        className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:border-accent-gold/50 focus:outline-none">
                                        <option value="">Select award...</option>
                                        {awards.filter(a => a.active).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleGrantByVid} disabled={granting || !grantVid || !grantAwardId}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                                        {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                                        {granting ? 'Granting...' : 'Grant Award'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/[0.06] pb-0">
                {(['awards', 'assignments'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${tab === t ? 'bg-[#0a0a0a] text-accent-gold border border-white/[0.06] border-b-transparent -mb-px' : 'text-gray-500 hover:text-white'}`}>
                        {t === 'awards' ? `Awards (${awards.length})` : `Assignments (${pilotAwards.length})`}
                    </button>
                ))}
            </div>

            {/* ── Awards Grid ── */}
            {tab === 'awards' && (
                <div className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input type="text" placeholder="Search awards..." value={searchAward} onChange={e => setSearchAward(e.target.value)}
                            className="w-full bg-[#080808] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-accent-gold/50 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAwards.map((a: any) => (
                            <div key={a._id} className={`bg-[#0a0a0a] border rounded-xl p-4 transition-colors ${a.active ? 'border-white/[0.06] hover:border-accent-gold/20' : 'border-red-500/20 opacity-60'}`}>
                                <div className="flex items-start gap-3">
                                    {a.imageUrl ? (
                                        <img src={a.imageUrl} alt={a.name} className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/50 shadow-[0_0_10px_rgba(0,207,213,0.3)] shrink-0" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center shrink-0">
                                            <Award className="w-6 h-6 text-accent-gold" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-white truncate">{a.name}</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{a.description || 'No description'}</p>
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            <span className="px-1.5 py-0.5 bg-white/5 border border-white/[0.08] rounded text-[9px] text-gray-400 font-bold">{a.category}</span>
                                            {a.linkedTourId?.name && (
                                                <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-bold truncate max-w-[120px]">{a.linkedTourId.name}</span>
                                            )}
                                            {!a.active && <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] text-red-400 font-bold">Inactive</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                                    <button onClick={() => openEdit(a)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors">
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button onClick={() => setDeleteTarget(a)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider transition-colors">
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredAwards.length === 0 && (
                            <div className="col-span-3 py-12 text-center text-gray-600">
                                <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No awards found. Create one above!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Assignments Table ── */}
            {tab === 'assignments' && (
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Current Assignments</h2>
                            <p className="text-gray-600 text-xs">{pilotAwards.length} total</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input type="text" placeholder="Search..." value={searchAssignment} onChange={e => setSearchAssignment(e.target.value)}
                                className="bg-[#080808] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white w-64 focus:border-accent-gold/50 focus:outline-none" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 bg-[#080808]/50 border-b border-white/[0.06]">
                                    <th className="p-4 font-bold">Pilot</th>
                                    <th className="p-4 font-bold">Award</th>
                                    <th className="p-4 font-bold">Category</th>
                                    <th className="p-4 font-bold">Earned</th>
                                    <th className="p-4 font-bold w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssignments.map((pa: any) => (
                                    <tr key={pa._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-accent-gold" /></div>
                                                <div>
                                                    <span className="text-white font-semibold text-sm">{pa.pilot_id?.first_name} {pa.pilot_id?.last_name}</span>
                                                    <span className="block text-accent-gold font-mono text-[10px]">{pa.pilot_id?.pilot_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2.5">
                                                {pa.award_id?.imageUrl ? (
                                                    <img src={pa.award_id.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-cyan-400/30" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center"><Award className="w-4 h-4 text-purple-400" /></div>
                                                )}
                                                <span className="text-white font-medium">{pa.award_id?.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {pa.award_id?.category ? <span className="px-2 py-1 bg-white/5 border border-white/[0.08] rounded-md text-xs text-gray-400">{pa.award_id.category}</span> : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono text-xs">{new Date(pa.earned_at || pa.awarded_at).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleRemoveAssignment(pa._id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAssignments.length === 0 && (
                                    <tr><td colSpan={5} className="p-12 text-center text-gray-600">
                                        <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p>No assignments yet.</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative w-full max-w-md bg-[#0a0a0a] border border-red-500/20 rounded-2xl p-6 shadow-2xl text-center">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Award</h3>
                        <p className="text-gray-400 text-sm mb-1">Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?</p>
                        <p className="text-red-400/70 text-xs mb-6">This will remove the award from all pilots&apos; profiles.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg bg-[#111] text-gray-400 hover:text-white transition-colors font-bold text-sm">Cancel</button>
                            <button onClick={handleDeleteAward} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors">Delete Forever</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
