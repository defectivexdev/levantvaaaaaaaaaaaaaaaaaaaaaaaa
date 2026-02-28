import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Pencil, X, Award, Shield, Loader2, ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';
import { fetchBadges, createBadge, updateBadge, deleteBadge } from '../api';
import { pushToast } from './ToastOverlay';
import type { BadgeDefinition } from '../types';

type FormData = {
  name: string;
  description: string;
  imageUrl: string;
  category: 'badge' | 'award';
  tourLink: string;
};

const emptyForm: FormData = { name: '', description: '', imageUrl: '', category: 'badge', tourLink: '' };

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BadgeManagement() {
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filter, setFilter] = useState<'all' | 'badge' | 'award'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchBadges();
    setBadges(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      pushToast('warning', 'Only image files (JPG/PNG) are accepted');
      return;
    }
    const slug = form.name.trim() ? slugify(form.name) : `award-${Date.now()}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${slug}.${ext}`;
    const objectUrl = URL.createObjectURL(file);
    setForm(f => ({ ...f, imageUrl: objectUrl }));
    pushToast('info', `Image ready: ${filename} — will be uploaded to /img/awards/`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { pushToast('warning', 'Award Name is required'); return; }
    if (!form.imageUrl.trim()) { pushToast('warning', 'Image is required — upload or paste a URL'); return; }

    setSaving(true);
    const payload = { name: form.name, description: form.description, imageUrl: form.imageUrl, category: form.category };
    if (editingId) {
      const updated = await updateBadge(editingId, payload);
      if (updated) {
        setBadges(prev => prev.map(b => b.id === editingId ? updated : b));
        pushToast('success', `Updated "${form.name}"`);
      } else {
        pushToast('danger', 'Failed to update');
      }
    } else {
      const created = await createBadge(payload);
      if (created) {
        setBadges(prev => [created, ...prev]);
        pushToast('success', `Created "${form.name}"`);
      } else {
        pushToast('danger', 'Failed to create');
      }
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (badge: BadgeDefinition) => {
    setForm({
      name: badge.name,
      description: badge.description,
      imageUrl: badge.imageUrl,
      category: badge.category,
      tourLink: '',
    });
    setEditingId(badge.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteBadge(id);
    if (ok) {
      setBadges(prev => prev.filter(b => b.id !== id));
      pushToast('success', 'Deleted');
    } else {
      pushToast('danger', 'Failed to delete');
    }
    setDeleteConfirm(null);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const filtered = filter === 'all' ? badges : badges.filter(b => b.category === filter);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#CCD6F6]">Levant VA Award Management</h3>
          <span className="text-[10px] font-mono text-[#333d55]">{badges.length} total</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold uppercase tracking-wider hover:bg-accent-gold/20 transition-all cursor-pointer"
        >
          <Plus size={12} />
          Create New Award
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'badge', 'award'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border-none cursor-pointer ${
              filter === tab
                ? 'bg-accent-gold/15 text-accent-gold'
                : 'bg-transparent text-[#8892b0] hover:text-white'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'badge' ? 'Badges' : 'Awards'}
            <span className="ml-1.5 text-[#333d55]">
              {tab === 'all' ? badges.length : badges.filter(b => b.category === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-2xl border border-[#1d3461] p-6 relative overflow-hidden" style={{ background: '#0A192F' }}>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent-gold/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#2DCE89]/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-base font-bold text-white">
                {editingId ? 'Edit VA Award' : 'Create New VA Award'}
              </h4>
              <button onClick={cancel} className="p-1.5 rounded-lg text-[#8892b0] hover:text-white hover:bg-white/5 transition-colors bg-transparent border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Award Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Award Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. "IFR Tour Master", "Night Owl", "37k Cruise Legend"'
                  className="w-full px-4 py-3 rounded-xl border border-[#1d3461] text-white text-sm placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 transition-colors"
                  style={{ background: '#0d1f38' }}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tell the pilot why they earned this... e.g. Completed 10 IFR Tours with a landing rate better than -200fpm"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#1d3461] text-white text-sm placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 transition-colors resize-none"
                  style={{ background: '#0d1f38' }}
                />
              </div>

              {/* Category + Tour Link row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Category</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm(f => ({ ...f, category: 'badge' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                        form.category === 'badge'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'border-[#1d3461] text-[#8892b0] hover:text-white'
                      }`}
                      style={form.category !== 'badge' ? { background: '#0d1f38' } : {}}
                    >
                      <Shield size={12} />
                      Badge
                    </button>
                    <button
                      onClick={() => setForm(f => ({ ...f, category: 'award' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                        form.category === 'award'
                          ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                          : 'border-[#1d3461] text-[#8892b0] hover:text-white'
                      }`}
                      style={form.category !== 'award' ? { background: '#0d1f38' } : {}}
                    >
                      <Award size={12} />
                      Award
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Tour Link (optional)</label>
                  <div className="relative">
                    <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333d55]" />
                    <input
                      type="url"
                      value={form.tourLink}
                      onChange={e => setForm(f => ({ ...f, tourLink: e.target.value }))}
                      placeholder="https://ivao.aero/tours/..."
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#1d3461] text-white text-xs font-mono placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 transition-colors"
                      style={{ background: '#0d1f38' }}
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload Zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Award Icon *</label>
                <div className="flex gap-3">
                  {/* Drag-and-drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-cyan-500/50 bg-cyan-500/5'
                        : 'border-[#1d3461] hover:border-accent-gold/30 hover:bg-accent-gold/[0.02]'
                    }`}
                  >
                    <Upload size={20} className={`mx-auto mb-2 ${dragOver ? 'text-cyan-400' : 'text-[#333d55]'}`} />
                    <p className="text-[#8892b0] text-xs">Drag and drop your award icon (JPG/PNG)</p>
                    <span className="text-[10px] text-[#333d55] uppercase tracking-widest mt-1 block">Recommended size: 512×512</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* Preview */}
                  <div className="w-28 flex flex-col items-center justify-center gap-2">
                    {form.imageUrl ? (
                      <>
                        <div className="pilot-badge-container !w-16 !h-16">
                          <img src={form.imageUrl} alt="preview" className="pilot-badge-img" onError={(e) => { (e.target as HTMLImageElement).src = 'img/icon.jpg'; }} />
                        </div>
                        <span className="text-[8px] text-[#2DCE89] font-mono uppercase tracking-wider">Ready</span>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full border border-[#1d3461] flex items-center justify-center" style={{ background: '#0d1f38' }}>
                          <ImageIcon size={20} className="text-[#333d55]" />
                        </div>
                        <span className="text-[8px] text-[#333d55] font-mono uppercase tracking-wider">No image</span>
                      </>
                    )}
                  </div>
                </div>

                {/* OR paste URL */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-px bg-[#1d3461]" />
                  <span className="text-[8px] text-[#333d55] uppercase tracking-widest">or paste URL</span>
                  <div className="flex-1 h-px bg-[#1d3461]" />
                </div>
                <input
                  type="text"
                  value={form.imageUrl.startsWith('blob:') ? '' : form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="/img/awards/ifr-tour-master.png"
                  className="w-full px-4 py-2 rounded-xl border border-[#1d3461] text-white text-xs font-mono placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 transition-colors"
                  style={{ background: '#0d1f38' }}
                />
              </div>

              {/* Slug preview */}
              {form.name.trim() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1d3461]" style={{ background: '#0d1f38' }}>
                  <span className="text-[8px] text-[#8892b0] uppercase tracking-widest">Asset path:</span>
                  <span className="text-[10px] font-mono text-accent-gold">/img/awards/{slugify(form.name)}.png</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={cancel}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#8892b0] hover:text-white transition-colors border border-[#1d3461] cursor-pointer"
                  style={{ background: '#0d1f38' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-[#0A192F] transition-all cursor-pointer border-none disabled:opacity-50 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #C5A059 0%, #a07d3a 100%)', boxShadow: '0 4px 20px rgba(197,160,89,0.2)' }}
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Publish to Levant VA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="text-accent-gold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
          <div className="p-4 rounded-2xl border border-[#1d3461]" style={{ background: '#0A192F' }}>
            <Award size={28} className="text-[#333d55]" />
          </div>
          <p className="text-xs text-[#8892b0] font-mono">No {filter === 'all' ? 'badges or awards' : `${filter}s`} found</p>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="text-[10px] font-bold uppercase tracking-wider text-accent-gold hover:text-accent-gold/80 transition-colors bg-transparent border-none cursor-pointer"
          >
            + Create your first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1">
          {filtered.map(badge => (
            <div
              key={badge.id}
              className="rounded-2xl border border-[#1d3461] p-5 flex flex-col items-center gap-3 group relative overflow-hidden transition-all hover:border-accent-gold/20"
              style={{ background: '#0A192F' }}
            >
              {/* Gradient glow overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: badge.category === 'award'
                  ? 'radial-gradient(ellipse at 50% 0%, rgba(197,160,89,0.06) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.06) 0%, transparent 70%)'
                }}
              />

              {/* Actions overlay */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => handleEdit(badge)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8892b0] hover:text-white transition-all border-none cursor-pointer"
                  title="Edit"
                >
                  <Pencil size={11} />
                </button>
                {deleteConfirm === badge.id ? (
                  <button
                    onClick={() => handleDelete(badge.id)}
                    className="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[8px] font-bold uppercase tracking-wider border-none cursor-pointer hover:bg-red-500/30 transition-all"
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(badge.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-[#8892b0] hover:text-red-400 transition-all border-none cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {/* Category pill */}
              <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                badge.category === 'award'
                  ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                {badge.category}
              </div>

              {/* Image with glow ring */}
              <div className="mt-4 relative">
                <div className={`absolute -inset-2 rounded-full blur-md ${
                  badge.category === 'award' ? 'bg-accent-gold/10' : 'bg-cyan-500/10'
                }`} />
                <div className="pilot-badge-container !w-16 !h-16 relative">
                  <img
                    src={badge.imageUrl}
                    alt={badge.name}
                    className="pilot-badge-img"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'img/icon.jpg'; }}
                  />
                </div>
              </div>

              {/* Name + Description */}
              <div className="text-center relative z-10">
                <p className="text-sm font-bold text-white">{badge.name}</p>
                {badge.description && (
                  <p className="text-[10px] text-[#8892b0] mt-1 line-clamp-2 leading-relaxed">{badge.description}</p>
                )}
              </div>

              {/* Created date */}
              {badge.createdAt && (
                <span className="text-[8px] font-mono text-[#333d55] mt-auto">
                  {new Date(badge.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
