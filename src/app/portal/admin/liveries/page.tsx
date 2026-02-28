'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Paintbrush, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Upload, FileArchive, Info, Search, Download, ChevronDown, Monitor, Github, X } from 'lucide-react';

interface Livery {
    filename: string;
    size: number;
    sha: string;
    download_url: string;
}

interface ParsedLivery extends Livery {
    displayName: string;
    simulator: string;
}

function parseLiveryFilename(filename: string): { displayName: string; simulator: string } {
    const raw = filename.replace(/\.zip$/i, '');
    const parts = raw.split('_');
    if (parts.length < 2) return { displayName: raw, simulator: 'Other' };
    const sim = parts[parts.length - 1].toUpperCase();
    const nameParts = parts.slice(0, -1);
    const displayName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return { displayName, simulator: sim === 'XPLANE' ? 'X-Plane' : sim };
}

const SIM_COLORS: Record<string, string> = {
    'MSFS': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    'X-Plane': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'P3D': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    'FSX': 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

export default function AdminLiveriesPage() {
    const [liveries, setLiveries] = useState<Livery[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [search, setSearch] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const [filename, setFilename] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        fetchLiveries();
    }, []);

    const fetchLiveries = async () => {
        try {
            const res = await fetch('/api/admin/liveries');
            const data = await res.json();
            if (data.success) setLiveries(data.liveries);
            else showToast('error', data.error || 'Failed to fetch liveries');
        } catch {
            showToast('error', 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !filename.trim()) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', filename.trim());

            const res = await fetch('/api/admin/liveries', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setLiveries(prev => [data.livery, ...prev]);
                setFilename('');
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setShowUpload(false);
                showToast('success', `Livery "${data.livery.filename}" uploaded to GitHub`);
            } else {
                showToast('error', data.error || 'Upload failed');
            }
        } catch {
            showToast('error', 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (livery: Livery) => {
        setDeleting(livery.filename);
        setConfirmDelete(null);
        const prev = liveries;
        setLiveries(liveries.filter(l => l.filename !== livery.filename));
        try {
            const res = await fetch(`/api/admin/liveries?filename=${encodeURIComponent(livery.filename)}&sha=${livery.sha}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message);
            } else {
                setLiveries(prev);
                showToast('error', data.error || 'Failed to delete');
            }
        } catch {
            setLiveries(prev);
            showToast('error', 'Connection error');
        } finally {
            setDeleting(null);
        }
    };

    const formatFileSize = useCallback((bytes: number) => {
        if (!bytes) return '—';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }, []);

    const parsed: ParsedLivery[] = useMemo(() =>
        liveries.map(l => {
            const p = parseLiveryFilename(l.filename);
            return { ...l, displayName: p.displayName, simulator: p.simulator };
        }),
    [liveries]);

    const filtered = useMemo(() =>
        parsed.filter(l =>
            `${l.displayName} ${l.simulator} ${l.filename}`.toLowerCase().includes(search.toLowerCase())
        ),
    [parsed, search]);

    const stats = useMemo(() => {
        const sims = parsed.reduce<Record<string, number>>((acc, l) => {
            acc[l.simulator] = (acc[l.simulator] || 0) + 1;
            return acc;
        }, {});
        const totalSize = liveries.reduce((s, l) => s + (l.size || 0), 0);
        return { total: liveries.length, sims, totalSize, simCount: Object.keys(sims).length };
    }, [parsed, liveries]);

    const filenamePreview = filename.trim() ? filename.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') + '.zip' : '';
    const previewParsed = filenamePreview ? parseLiveryFilename(filenamePreview) : null;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${
                    toast.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Paintbrush className="w-8 h-8 text-accent-gold" />
                        Livery Management
                    </h1>
                    <p className="text-gray-400 mt-1">Upload and manage liveries stored on GitHub</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-gray-300 font-bold text-xs rounded-xl transition-colors"
                    >
                        <Info size={14} />
                        Guide
                    </button>
                    <button
                        onClick={() => { setShowUpload(!showUpload); setConfirmDelete(null); }}
                        className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-5 py-2.5 rounded-xl transition-colors"
                    >
                        <Plus size={16} />
                        Upload Livery
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Liveries', value: stats.total, color: 'text-accent-gold' },
                    { label: 'Simulators', value: stats.simCount, color: 'text-blue-400' },
                    { label: 'Total Size', value: formatFileSize(stats.totalSize), color: 'text-emerald-400' },
                    { label: 'Repository', value: 'GitHub', color: 'text-purple-400', icon: Github },
                ].map(s => (
                    <div key={s.label} className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {s.icon && <s.icon size={16} className={s.color} />}
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Naming Convention Guide (collapsible) */}
            {showGuide && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 relative">
                    <button onClick={() => setShowGuide(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white">
                        <X size={14} />
                    </button>
                    <div className="flex items-start gap-3">
                        <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-300 space-y-3">
                            <p className="font-bold text-white">Filename Convention</p>
                            <p className="text-gray-400">
                                Use underscores to separate parts. The <strong className="text-white">last segment</strong> determines which simulator table the livery appears in for pilots.
                            </p>
                            <div className="grid md:grid-cols-3 gap-3">
                                {[
                                    { example: 'fenix_a320_levant_msfs', sim: 'MSFS', result: 'Fenix A320 Levant' },
                                    { example: 'toliss_a339_levant_xplane', sim: 'X-Plane', result: 'Toliss A339 Levant' },
                                    { example: 'pmdg_b738_levant_p3d', sim: 'P3D', result: 'Pmdg B738 Levant' },
                                ].map(e => (
                                    <div key={e.example} className="bg-black/30 rounded-lg p-3 border border-white/[0.06]">
                                        <p className="font-mono text-xs text-accent-gold mb-1">{e.example}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SIM_COLORS[e.sim] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>{e.sim}</span>
                                            <span className="text-xs text-gray-400">{e.result}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Form (collapsible) */}
            {showUpload && (
                <form onSubmit={handleUpload} className="bg-[#111] border border-accent-gold/20 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Upload size={18} className="text-accent-gold" />
                            Upload New Livery
                        </h2>
                        <button type="button" onClick={() => setShowUpload(false)} className="text-gray-500 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Filename *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. fenix_a320_levant_msfs"
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                    className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-gold/50 font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">ZIP File *</label>
                                <label className="flex items-center gap-3 bg-[#080808] border border-dashed border-white/10 rounded-lg px-4 py-3 cursor-pointer hover:border-accent-gold/40 transition-colors group">
                                    <div className="w-10 h-10 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center group-hover:bg-accent-gold/20 transition-colors shrink-0">
                                        <FileArchive size={18} className="text-accent-gold" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">{file ? file.name : 'Click to choose a .zip file'}</p>
                                        {file && <p className="text-[10px] text-gray-500 font-mono">{formatFileSize(file.size)}</p>}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        required
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="space-y-3">
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Preview</label>
                            <div className="bg-[#080808] rounded-lg p-4 border border-white/[0.06] space-y-3">
                                {filenamePreview ? (
                                    <>
                                        <div>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Output File</p>
                                            <p className="text-sm font-mono text-white">{filenamePreview}</p>
                                        </div>
                                        {previewParsed && (
                                            <>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Display Name</p>
                                                        <p className="text-sm text-white">{previewParsed.displayName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Simulator</p>
                                                        <span className={`inline-flex text-xs font-bold px-2 py-0.5 rounded border ${SIM_COLORS[previewParsed.simulator] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>
                                                            {previewParsed.simulator}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-600 text-center py-4">Type a filename to see the preview</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !file || !filename.trim()}
                                className="w-full bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold py-3 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploading ? 'Pushing to GitHub...' : 'Upload to GitHub'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search liveries..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#111] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-accent-gold/50"
                />
            </div>

            {/* Liveries Table */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 bg-[#080808]/50 border-b border-white/[0.06]">
                                <th className="p-4 font-bold">Livery</th>
                                <th className="p-4 font-bold">Simulator</th>
                                <th className="p-4 font-bold">Filename</th>
                                <th className="p-4 font-bold">Size</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((livery) => (
                                <tr key={livery.filename} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center shrink-0">
                                                <FileArchive size={16} className="text-accent-gold" />
                                            </div>
                                            <span className="text-sm font-medium text-white">{livery.displayName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${SIM_COLORS[livery.simulator] || 'bg-gray-500/15 text-gray-400 border-gray-500/25'}`}>
                                            <Monitor size={10} />
                                            {livery.simulator}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs text-gray-500 font-mono">{livery.filename}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm text-gray-400 font-mono">{formatFileSize(livery.size)}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {confirmDelete === livery.filename ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-xs text-red-400 mr-1">Delete?</span>
                                                <button
                                                    onClick={() => handleDelete(livery)}
                                                    disabled={deleting === livery.filename}
                                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                                                >
                                                    {deleting === livery.filename ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(null)}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-gray-400 text-xs font-bold rounded-lg transition-all"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                <a
                                                    href={livery.download_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={() => setConfirmDelete(livery.filename)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>{liveries.length === 0 ? 'No liveries uploaded yet' : 'No liveries match your search'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
