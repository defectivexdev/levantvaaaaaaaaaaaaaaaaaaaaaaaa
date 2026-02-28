import { useState, useEffect, useCallback } from 'react';
import { motion, Reorder } from 'motion/react';
import {
  Map, Send, CheckCircle2, XCircle, Clock,
  Loader2, ExternalLink, MessageSquare, Shield, Lock, Unlock,
  Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Pencil,
  BookOpen, Plane, X, ImageIcon,
} from 'lucide-react';
import {
  fetchTours, createTour, fetchTourProgress, submitLegReport,
  fetchPendingReports, modifyLegReport,
  reviewLegReport, sendTourReportWebhook,
} from '../api';
import { pushToast } from './ToastOverlay';
import type { TourDefinition, TourProgress, LegReport, TourLeg } from '../types';

// ── Fleet Restriction (No A380) ────────────────────────────────

const RESTRICTED_AIRCRAFT = ['A380', 'A388', 'AIRBUS A380'];

function isAircraftRestricted(type: string): boolean {
  return RESTRICTED_AIRCRAFT.some(ac => type.toUpperCase().includes(ac));
}

function validateFlightAircraft(aircraft: string): { ok: boolean; reason?: string } {
  if (isAircraftRestricted(aircraft)) {
    return { ok: false, reason: 'Levant VA does not operate the A380. Please use an approved fleet aircraft.' };
  }
  return { ok: true };
}

// ── SimBrief Dispatch Button ───────────────────────────────────

function SimBriefButton({ dep, arr, flightNum, aircraft }: { dep: string; arr: string; flightNum?: string; aircraft?: string }) {
  const type = aircraft || 'A320';
  const restricted = isAircraftRestricted(type);
  const url = `https://dispatch.simbrief.com/options/custom?airline=LVT&fltnum=${flightNum || ''}&orig=${dep}&dest=${arr}&type=${type}&units=KGS`;

  if (restricted) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-500/10 border border-red-500/25 rounded-lg opacity-60 shrink-0 cursor-not-allowed" title="A380 is not permitted for Levant VA Tours">
        <div className="bg-red-500/30 p-1 rounded">
          <Plane size={10} className="text-red-400" />
        </div>
        <div className="leading-none">
          <span className="text-red-400 font-bold text-[9px] uppercase tracking-wider block">BLOCKED</span>
          <span className="text-red-400/60 text-[7px]">A380 not permitted</span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-2.5 py-1.5 bg-[#ff6b00]/10 border border-[#ff6b00]/25 rounded-lg hover:bg-[#ff6b00]/20 transition-all group no-underline shrink-0"
    >
      <div className="bg-[#ff6b00] p-1 rounded">
        <Plane size={10} className="text-white" />
      </div>
      <div className="leading-none">
        <span className="text-[#ff6b00] font-bold text-[9px] uppercase tracking-wider block">SimBrief</span>
        <span className="text-[#8892b0] text-[8px]">{dep}→{arr}</span>
      </div>
    </a>
  );
}

// ── Tour Status Card (hero progress visualization) ─────────────

function TourStatusCard({ progress, tour }: { progress: TourProgress | null; tour: TourDefinition }) {
  const completed = progress?.legsCompleted ?? 0;
  const total = tour.totalLegs;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full p-6 rounded-[24px] border border-[#1d3461] overflow-hidden relative" style={{ background: '#0A192F' }}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-2xl font-bold text-white font-mono">{tour.tourId} {tour.name}</h2>
            <p className="text-[#8892b0] text-xs mt-1 uppercase tracking-widest max-w-md">{tour.description}</p>
          </div>
          {tour.awardImageUrl && (
            <div className="relative">
              <div className="absolute -inset-2 rounded-full blur-md bg-accent-gold/10" />
              <div className="pilot-badge-container !w-14 !h-14 relative">
                <img src={tour.awardImageUrl} alt="award" className="pilot-badge-img" onError={(e) => { (e.target as HTMLImageElement).src = 'img/icon.jpg'; }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end gap-4 mb-3 mt-4">
          <span className="text-5xl font-bold text-cyan-400 font-mono">{completed}</span>
          <span className="text-xl text-[#333d55] font-mono mb-1.5">/ {total} LEGS</span>
        </div>

        <div className="w-full h-3.5 rounded-full border border-[#1d3461] p-0.5" style={{ background: '#0d1f38' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #2DCE89)', boxShadow: '0 0 15px rgba(34,211,238,0.4)' }}
          />
        </div>

        <div className="mt-3 flex justify-between text-[10px] font-bold text-[#8892b0] uppercase tracking-wider">
          <span>{percentage}% Journey Completed</span>
          <span>{total - completed} Legs Remaining</span>
        </div>

        {progress?.status === 'completed' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20">
            <CheckCircle2 size={14} className="text-accent-gold" />
            <span className="text-sm font-bold text-accent-gold uppercase tracking-wider">Tour Completed — Award Earned!</span>
          </div>
        )}
      </div>
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/8 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent-gold/5 blur-[80px] rounded-full pointer-events-none" />
    </div>
  );
}

// ── Admin Tour Creator ─────────────────────────────────────────

function AdminTourCreator({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tourId, setTourId] = useState('');
  const [description, setDescription] = useState('');
  const [awardImageUrl, setAwardImageUrl] = useState('');
  const [requireApproval, setRequireApproval] = useState(true);
  const [legs, setLegs] = useState<TourLeg[]>([]);
  const [autoSequence, setAutoSequence] = useState(true);
  const [newArr, setNewArr] = useState('');
  const [newDep, setNewDep] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDep, setEditDep] = useState('');
  const [editArr, setEditArr] = useState('');
  const [bulkIcao, setBulkIcao] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const addLeg = () => {
    const dep = autoSequence && legs.length > 0
      ? legs[legs.length - 1].arrivalIcao
      : newDep.trim().toUpperCase();
    const arr = newArr.trim().toUpperCase();
    if (!dep || !arr) { pushToast('warning', 'Both DEP and ARR are required'); return; }
    if (dep.length !== 4 || arr.length !== 4) { pushToast('warning', 'ICAO codes must be 4 characters'); return; }
    setLegs(prev => [...prev, { legNumber: prev.length + 1, departureIcao: dep, arrivalIcao: arr }]);
    setNewArr('');
    setNewDep('');
  };

  const removeLeg = (idx: number) => {
    setLegs(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, legNumber: i + 1 })));
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDep(legs[idx].departureIcao);
    setEditArr(legs[idx].arrivalIcao);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const d = editDep.trim().toUpperCase();
    const a = editArr.trim().toUpperCase();
    if (!d || !a || d.length !== 4 || a.length !== 4) { pushToast('warning', 'Invalid ICAO codes'); return; }
    setLegs(prev => prev.map((l, i) => i === editingIdx ? { ...l, departureIcao: d, arrivalIcao: a } : l));
    setEditingIdx(null);
  };

  const handleBulkImport = () => {
    const codes = bulkIcao.trim().split(/[\s,;]+/).map(s => s.toUpperCase()).filter(s => s.length === 4 && /^[A-Z]{4}$/.test(s));
    if (codes.length < 2) { pushToast('warning', 'Need at least 2 valid 4-letter ICAO codes'); return; }
    const newLegs: TourLeg[] = [];
    const startIdx = legs.length;
    for (let i = 0; i < codes.length - 1; i++) {
      newLegs.push({ legNumber: startIdx + i + 1, departureIcao: codes[i], arrivalIcao: codes[i + 1] });
    }
    setLegs(prev => [...prev, ...newLegs].map((l, i) => ({ ...l, legNumber: i + 1 })));
    setBulkIcao('');
    setShowBulk(false);
    pushToast('success', `Imported ${newLegs.length} legs from ${codes.length} ICAOs`);
  };

  const handleReorder = (newOrder: TourLeg[]) => {
    setLegs(newOrder.map((l, i) => ({ ...l, legNumber: i + 1 })));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !tourId.trim()) { pushToast('warning', 'Tour Name and Tour ID are required'); return; }
    if (legs.length === 0) { pushToast('warning', 'Add at least one leg'); return; }
    setSaving(true);
    const result = await createTour({
      name: name.trim(),
      tourId: tourId.trim(),
      description: description.trim(),
      awardImageUrl: awardImageUrl.trim(),
      totalLegs: legs.length,
      legs,
      requireAdminApproval: requireApproval,
    });
    if (result) {
      pushToast('success', `Tour "${name}" created with ${legs.length} legs`);
      onCreated();
      setName(''); setTourId(''); setDescription(''); setAwardImageUrl('');
      setLegs([]); setNewArr(''); setNewDep('');
    } else {
      pushToast('danger', 'Failed to create tour');
    }
    setSaving(false);
  };

  // Sequence validation
  const seqErrors: number[] = [];
  for (let i = 1; i < legs.length; i++) {
    if (legs[i].departureIcao !== legs[i - 1].arrivalIcao) seqErrors.push(i);
  }

  return (
    <div className="rounded-2xl border border-[#1d3461] p-5 relative overflow-hidden" style={{ background: '#0A192F' }}>
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent-gold/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="relative z-10">
        <h3 className="text-base font-bold text-white mb-4">Create New Tour</h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Tour ID *</label>
            <input value={tourId} onChange={e => setTourId(e.target.value)} placeholder="XM-3272"
              className="px-3 py-2 rounded-xl border border-[#1d3461] text-white text-xs font-mono placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40" style={{ background: '#0d1f38' }} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Tour Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Thailand IFR Tour 2024"
              className="px-3 py-2 rounded-xl border border-[#1d3461] text-white text-xs placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40" style={{ background: '#0d1f38' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Tour rules and description..."
              className="px-3 py-2 rounded-xl border border-[#1d3461] text-white text-xs placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 resize-none" style={{ background: '#0d1f38' }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Award Image URL</label>
            <div className="flex gap-2 items-start">
              <input value={awardImageUrl} onChange={e => setAwardImageUrl(e.target.value)} placeholder="/img/awards/3272-award.png"
                className="flex-1 px-3 py-2 rounded-xl border border-[#1d3461] text-white text-xs font-mono placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40" style={{ background: '#0d1f38' }} />
              {awardImageUrl ? (
                <div className="pilot-badge-container !w-9 !h-9 shrink-0">
                  <img src={awardImageUrl} alt="" className="pilot-badge-img" onError={e => { (e.target as HTMLImageElement).src = 'img/icon.jpg'; }} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full border border-[#1d3461] flex items-center justify-center shrink-0" style={{ background: '#0d1f38' }}>
                  <ImageIcon size={14} className="text-[#333d55]" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setRequireApproval(v => !v)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer text-[#8892b0] hover:text-white transition-colors">
                {requireApproval ? <ToggleRight size={14} className="text-[#2DCE89]" /> : <ToggleLeft size={14} className="text-[#333d55]" />}
                Admin Approval {requireApproval ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Leg Sequencer */}
        <div className="border border-[#1d3461] rounded-xl overflow-hidden" style={{ background: '#0d1f38' }}>
          <div className="px-3 py-2 border-b border-[#1d3461] flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CCD6F6]">Leg Sequencer ({legs.length} legs)</h4>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulk(v => !v)} className="text-[8px] font-bold uppercase tracking-wider text-accent-gold hover:text-accent-gold/80 bg-transparent border-none cursor-pointer transition-colors">
                {showBulk ? '× Close' : 'Bulk Import'}
              </button>
              <button onClick={() => setAutoSequence(v => !v)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer text-[#8892b0] hover:text-white transition-colors">
                {autoSequence ? <ToggleRight size={14} className="text-cyan-400" /> : <ToggleLeft size={14} className="text-[#333d55]" />}
                Auto-Seq
              </button>
            </div>
          </div>

          {/* Bulk ICAO Import */}
          {showBulk && (
            <div className="px-3 py-2 border-b border-accent-gold/15 bg-accent-gold/[0.02]">
              <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-1 block">Paste ICAOs (space/comma separated)</label>
              <div className="flex gap-2">
                <input
                  value={bulkIcao}
                  onChange={e => setBulkIcao(e.target.value)}
                  placeholder="VTBD VTSP VTCC VTBS VTSM VTUD ..."
                  className="flex-1 px-2 py-1.5 rounded border border-[#1d3461] text-white text-[10px] font-mono placeholder:text-[#333d55] focus:outline-none focus:border-accent-gold/40 uppercase bg-transparent"
                />
                <button onClick={handleBulkImport}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-accent-gold bg-accent-gold/10 border border-accent-gold/20 cursor-pointer hover:bg-accent-gold/20 transition-all">
                  Import
                </button>
              </div>
              <span className="text-[8px] text-[#8892b0] mt-1 block">Each consecutive pair becomes a leg: A→B, B→C, C→D...</span>
            </div>
          )}

          {/* Add leg row */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1d3461]">
            {autoSequence && legs.length > 0 ? (
              <span className="text-[10px] font-mono text-cyan-400 w-14 text-center shrink-0">{legs[legs.length - 1].arrivalIcao}</span>
            ) : (
              <input value={newDep} onChange={e => setNewDep(e.target.value)} placeholder="DEP" maxLength={4}
                className="w-14 text-center px-1 py-1.5 rounded border border-[#1d3461] text-white text-[10px] font-mono placeholder:text-[#333d55] focus:outline-none focus:border-cyan-500 uppercase bg-transparent" />
            )}
            <span className="text-[#333d55] text-[10px]">→</span>
            <input value={newArr} onChange={e => setNewArr(e.target.value)} placeholder="ARR"
              maxLength={4}
              onKeyDown={e => e.key === 'Enter' && addLeg()}
              className="w-14 text-center px-1 py-1.5 rounded border border-[#1d3461] text-white text-[10px] font-mono placeholder:text-[#333d55] focus:outline-none focus:border-cyan-500 uppercase bg-transparent" />
            <button onClick={addLeg} className="px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-all flex items-center gap-1">
              <Plus size={10} /> Add Leg
            </button>
            {autoSequence && <span className="text-[8px] text-[#8892b0] italic ml-auto">DEP auto-filled from previous ARR</span>}
          </div>

          {/* Sequence errors */}
          {seqErrors.length > 0 && (
            <div className="px-3 py-1.5 bg-red-500/5 border-b border-red-500/10">
              <span className="text-[9px] text-red-400 font-bold">⚠ Sequence break at leg(s): {seqErrors.map(i => i + 1).join(', ')} — ARR of previous ≠ DEP of next</span>
            </div>
          )}

          {/* Draggable leg list */}
          {legs.length > 0 && (
            <Reorder.Group axis="y" values={legs} onReorder={handleReorder} className="max-h-[200px] overflow-y-auto p-1">
              {legs.map((leg, idx) => (
                <Reorder.Item key={`${leg.legNumber}-${leg.departureIcao}-${leg.arrivalIcao}`} value={leg}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical size={10} className="text-[#333d55] shrink-0" />
                  <span className="text-[10px] font-mono text-accent-gold w-8 shrink-0">{String(idx + 1).padStart(2, '0')}</span>

                  {editingIdx === idx ? (
                    <>
                      <input value={editDep} onChange={e => setEditDep(e.target.value)} maxLength={4}
                        className="w-12 text-center px-1 py-0.5 rounded border border-cyan-500/30 text-white text-[10px] font-mono uppercase bg-transparent focus:outline-none" />
                      <span className="text-[#333d55] text-[10px]">→</span>
                      <input value={editArr} onChange={e => setEditArr(e.target.value)} maxLength={4}
                        className="w-12 text-center px-1 py-0.5 rounded border border-cyan-500/30 text-white text-[10px] font-mono uppercase bg-transparent focus:outline-none" />
                      <button onClick={saveEdit} className="text-[8px] text-[#2DCE89] font-bold bg-transparent border-none cursor-pointer">Save</button>
                      <button onClick={() => setEditingIdx(null)} className="text-[8px] text-[#8892b0] font-bold bg-transparent border-none cursor-pointer">×</button>
                    </>
                  ) : (
                    <>
                      <span className={`text-[10px] font-mono text-white ${seqErrors.includes(idx) ? 'text-red-400' : ''}`}>
                        {leg.departureIcao} — {leg.arrivalIcao}
                      </span>
                      <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <SimBriefButton dep={leg.departureIcao} arr={leg.arrivalIcao} />
                        <button onClick={() => startEdit(idx)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#8892b0] hover:text-white transition-all border-none cursor-pointer">
                          <Pencil size={9} />
                        </button>
                        <button onClick={() => removeLeg(idx)} className="p-1 rounded bg-white/5 hover:bg-red-500/10 text-[#8892b0] hover:text-red-400 transition-all border-none cursor-pointer">
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-[#0A192F] transition-all cursor-pointer border-none disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C5A059, #a07d3a)', boxShadow: '0 4px 20px rgba(197,160,89,0.2)' }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            Publish Tour
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Leg Tracker (pilot scrollable list + SimBrief) ─────────────

function LegTracker({
  legs, reports, activeLeg, onSelectLeg, tourDescription,
}: {
  legs: TourLeg[];
  reports: LegReport[];
  activeLeg: number | null;
  onSelectLeg: (legNum: number) => void;
  tourDescription?: string;
}) {
  const [showRules, setShowRules] = useState(false);

  const getStatus = (legNum: number) => {
    const report = reports.find(r => r.legNumber === legNum);
    if (!report) return 'locked';
    return report.status;
  };

  const highestApproved = reports
    .filter(r => r.status === 'approved')
    .reduce((max, r) => Math.max(max, r.legNumber), 0);

  return (
    <div className="rounded-2xl border border-[#1d3461] overflow-hidden flex flex-col" style={{ background: '#0A192F' }}>
      <div className="px-4 py-3 border-b border-[#1d3461] flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#CCD6F6]">Leg Tracker</h3>
        <div className="flex items-center gap-2">
          {tourDescription && (
            <button onClick={() => setShowRules(v => !v)} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#8892b0] hover:text-white bg-transparent border-none cursor-pointer transition-colors">
              <BookOpen size={10} /> Rules
            </button>
          )}
          <span className="text-[10px] font-mono text-[#333d55]">{legs.length} legs</span>
        </div>
      </div>

      {/* Rule overlay */}
      {showRules && tourDescription && (
        <div className="px-4 py-3 border-b border-[#1d3461] bg-accent-gold/[0.02]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold">Tour Rules</span>
            <button onClick={() => setShowRules(false)} className="p-0.5 text-[#8892b0] hover:text-white bg-transparent border-none cursor-pointer"><X size={10} /></button>
          </div>
          <p className="text-[10px] text-[#8892b0] leading-relaxed whitespace-pre-wrap">{tourDescription}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[340px]">
        {legs.map(leg => {
          const status = getStatus(leg.legNumber);
          const isActive = activeLeg === leg.legNumber;
          const canReport = leg.legNumber <= highestApproved + 1;
          const isPending = status === 'pending';
          const isApproved = status === 'approved';
          const isRejected = status === 'rejected';

          const borderColor = isApproved ? '#2DCE89'
            : isPending ? '#C5A059'
            : isRejected ? '#ef4444'
            : isActive ? '#22d3ee'
            : '#1d3461';

          return (
            <div key={leg.legNumber}
              className={`flex items-center justify-between p-2.5 rounded-xl border-l-4 transition-all ${
                !canReport ? 'opacity-40' : 'hover:bg-white/[0.02]'
              }`}
              style={{ borderLeftColor: borderColor, background: isActive ? 'rgba(34,211,238,0.03)' : 'transparent' }}
            >
              <button
                onClick={() => canReport && onSelectLeg(leg.legNumber)}
                disabled={!canReport}
                className={`flex items-center gap-2 bg-transparent border-none text-left ${canReport ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                {!canReport && <Lock size={10} className="text-[#333d55]" />}
                {canReport && !isApproved && !isPending && !isRejected && <Unlock size={10} className="text-[#8892b0]" />}
                {isApproved && <CheckCircle2 size={11} className="text-[#2DCE89]" />}
                {isPending && <Clock size={11} className="text-accent-gold" />}
                {isRejected && <XCircle size={11} className="text-red-400" />}
                <span className="text-white text-[10px] font-mono">
                  LEG {String(leg.legNumber).padStart(2, '0')}: {leg.departureIcao} — {leg.arrivalIcao}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {canReport && !isApproved && (
                  <SimBriefButton dep={leg.departureIcao} arr={leg.arrivalIcao} />
                )}
                <span className={`text-[8px] font-bold uppercase tracking-wider italic shrink-0 ${
                  isApproved ? 'text-[#2DCE89]' : isPending ? 'text-accent-gold' : isRejected ? 'text-red-400' : 'text-[#333d55]'
                }`}>
                  {isApproved ? '✓' : isPending ? '⏳' : isRejected ? '✕' : canReport ? '→' : '🔒'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Report Form (pilot submission with DEP/ARR validation) ─────

function TourReportForm({
  tourId, tourName, totalLegs, leg, pilotId, pilotName, onSubmitted,
}: {
  tourId: string;
  tourName: string;
  totalLegs: number;
  leg: TourLeg;
  pilotId: string;
  pilotName: string;
  onSubmitted: (report: LegReport) => void;
}) {
  const [pirepId, setPirepId] = useState('');
  const [ivaoUrl, setIvaoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!pirepId.trim() && !ivaoUrl.trim()) {
      pushToast('warning', 'Please provide a PIREP ID or IVAO Flight Link');
      return;
    }
    if (ivaoUrl.trim() && !ivaoUrl.includes('ivao.aero') && !ivaoUrl.startsWith('http')) {
      pushToast('warning', 'IVAO URL should be a valid ivao.aero link');
      return;
    }

    setSubmitting(true);
    const report = await submitLegReport({
      pilotId, pilotName, tourId,
      legNumber: leg.legNumber,
      departureIcao: leg.departureIcao,
      arrivalIcao: leg.arrivalIcao,
      pirepId: pirepId.trim(),
      ivaoUrl: ivaoUrl.trim(),
      notes: notes.trim(),
    });

    if (report) {
      pushToast('success', `Leg ${leg.legNumber} submitted for validation`);
      onSubmitted(report);
      sendTourReportWebhook({
        pilotName, tourName,
        legNumber: leg.legNumber, totalLegs,
        departureIcao: leg.departureIcao, arrivalIcao: leg.arrivalIcao,
        status: 'submitted',
      });
      setPirepId(''); setIvaoUrl(''); setNotes('');
    } else {
      pushToast('danger', 'Failed to submit leg report');
    }
    setSubmitting(false);
  };

  const simBriefUrl = `https://dispatch.simbrief.com/options/custom?airline=LVT&fltnum=&orig=${leg.departureIcao}&dest=${leg.arrivalIcao}&type=A320&units=KGS`;

  return (
    <div className="rounded-2xl border border-[#1d3461] p-5 relative overflow-hidden flex flex-col" style={{ background: '#0A192F' }}>
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">
            Report Leg {String(leg.legNumber).padStart(2, '0')}: {leg.departureIcao} → {leg.arrivalIcao}
          </h3>
          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-mono font-bold border border-cyan-500/20">
            {tourId}
          </span>
        </div>

        {/* SimBrief Dispatch */}
        <a href={simBriefUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-[#ff6b00]/10 border border-[#ff6b00]/25 rounded-xl hover:bg-[#ff6b00]/20 transition-all mb-3 no-underline">
          <div className="bg-[#ff6b00] p-2 rounded-lg">
            <Plane size={14} className="text-white" />
          </div>
          <div>
            <h4 className="text-[#ff6b00] font-bold text-xs uppercase tracking-wider">SimBrief Dispatch</h4>
            <p className="text-[#8892b0] text-[10px]">Auto-generate OFP for {leg.departureIcao} → {leg.arrivalIcao}</p>
          </div>
        </a>

        {/* DEP/ARR verification badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1d3461] mb-3" style={{ background: '#0d1f38' }}>
          <CheckCircle2 size={10} className="text-[#2DCE89]" />
          <span className="text-[9px] text-[#8892b0] font-mono">Route locked: <span className="text-cyan-400">{leg.departureIcao}</span> → <span className="text-cyan-400">{leg.arrivalIcao}</span> — must match your PIREP</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-xl border border-[#1d3461]" style={{ background: '#0d1f38' }}>
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">PIREP ID (from ACARS)</label>
            <input type="text" value={pirepId} onChange={e => setPirepId(e.target.value)} placeholder="e.g. PIR-12345"
              className="bg-transparent border-b border-[#1d3461] p-2 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 placeholder:text-[#333d55] transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">IVAO Flight Link</label>
            <input type="text" value={ivaoUrl} onChange={e => setIvaoUrl(e.target.value)} placeholder="https://ivao.aero/tracker/..."
              className="bg-transparent border-b border-[#1d3461] p-2 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 placeholder:text-[#333d55] transition-colors" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8892b0]">Pilot Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes for admin review..."
              className="bg-transparent border-b border-[#1d3461] p-2 text-white text-xs placeholder:text-[#333d55] focus:outline-none focus:border-cyan-500 transition-colors" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-2 mt-auto"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #2DCE89)', boxShadow: '0 4px 20px rgba(34,211,238,0.2)' }}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit Leg for Validation
        </button>
      </div>
    </div>
  );
}

// ── Admin Validation Queue (with Modify action) ────────────────

function AdminValidationQueue({
  reports, totalLegs, onReviewed,
}: {
  reports: LegReport[];
  totalLegs: number;
  onReviewed: () => void;
}) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [modifyingId, setModifyingId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [modIvaoUrl, setModIvaoUrl] = useState('');
  const [modPirepId, setModPirepId] = useState('');
  const [processing, setProcessing] = useState(false);

  const pending = reports.filter(r => r.status === 'pending');

  const handleReview = async (reportId: string, decision: 'approve' | 'reject') => {
    setProcessing(true);
    const ok = await reviewLegReport(reportId, decision, comment);
    if (ok) {
      pushToast('success', `Report ${decision === 'approve' ? 'approved' : 'rejected'}`);
      const report = reports.find(r => r.id === reportId);
      if (report) {
        sendTourReportWebhook({
          pilotName: report.pilotName, tourName: report.tourId,
          legNumber: report.legNumber, totalLegs,
          departureIcao: report.departureIcao, arrivalIcao: report.arrivalIcao,
          status: decision === 'approve' ? 'approved' : 'rejected',
        });
      }
      onReviewed();
    } else {
      pushToast('danger', 'Failed to review report');
    }
    setProcessing(false);
    setReviewingId(null);
    setComment('');
  };

  const handleModify = async (reportId: string) => {
    setProcessing(true);
    const fields: { ivaoUrl?: string; pirepId?: string } = {};
    if (modIvaoUrl.trim()) fields.ivaoUrl = modIvaoUrl.trim();
    if (modPirepId.trim()) fields.pirepId = modPirepId.trim();
    const ok = await modifyLegReport(reportId, fields);
    if (ok) {
      pushToast('success', 'Report modified');
      onReviewed();
    } else {
      pushToast('danger', 'Failed to modify report');
    }
    setProcessing(false);
    setModifyingId(null);
    setModIvaoUrl('');
    setModPirepId('');
  };

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1d3461] p-6 text-center" style={{ background: '#0A192F' }}>
        <Shield size={24} className="mx-auto text-[#333d55] mb-2" />
        <p className="text-xs text-[#8892b0] font-mono">No pending reports to review</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1d3461] overflow-hidden" style={{ background: '#0A192F' }}>
      <div className="px-4 py-3 border-b border-[#1d3461] flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#CCD6F6]">
          <Shield size={12} className="inline mr-2 text-accent-gold" />
          Admin Validation Queue
        </h3>
        <span className="px-2 py-0.5 bg-accent-gold/10 text-accent-gold rounded-full text-[10px] font-bold border border-accent-gold/20">
          {pending.length} pending
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
        {pending.map(report => (
          <div key={report.id} className="p-3 rounded-xl border border-[#1d3461] transition-all" style={{ background: '#0d1f38' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{report.pilotName}</span>
                <span className="text-[10px] font-mono text-accent-gold">LEG {String(report.legNumber).padStart(2, '0')}</span>
              </div>
              <span className="text-[9px] font-mono text-[#333d55]">{new Date(report.submittedAt).toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400">{report.departureIcao} → {report.arrivalIcao}</span>
              {report.pirepId && <span className="text-[10px] font-mono text-[#8892b0]">PIREP: {report.pirepId}</span>}
              {report.aircraft && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isAircraftRestricted(report.aircraft)
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'text-[#8892b0]'
                }`}>
                  {report.aircraft}{isAircraftRestricted(report.aircraft) && ' ⚠ FLEET VIOLATION'}
                </span>
              )}
              {report.ivaoUrl && (
                <a href={report.ivaoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  <ExternalLink size={9} /> IVAO
                </a>
              )}
            </div>

            {/* A380 Fleet Violation Warning */}
            {report.aircraft && isAircraftRestricted(report.aircraft) && (
              <div className="flex items-center justify-between mb-2 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  {validateFlightAircraft(report.aircraft).reason}
                </span>
                <button
                  onClick={() => { setComment('Rejected: Levant VA does not operate A380 aircraft.'); handleReview(report.id, 'reject'); }}
                  disabled={processing}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/25 cursor-pointer hover:bg-red-500/25 transition-all disabled:opacity-50 shrink-0"
                >
                  Quick Reject: A380
                </button>
              </div>
            )}

            {report.notes && <p className="text-[10px] text-[#8892b0] mb-2 italic">"{report.notes}"</p>}

            {/* Modify mode */}
            {modifyingId === report.id ? (
              <div className="space-y-2 mb-2 p-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.02]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">Modify Report</span>
                <div className="grid grid-cols-2 gap-2">
                  <input value={modPirepId} onChange={e => setModPirepId(e.target.value)} placeholder={report.pirepId || 'PIREP ID'}
                    className="bg-transparent border-b border-[#1d3461] p-1 text-white text-[10px] font-mono focus:outline-none focus:border-cyan-500 placeholder:text-[#333d55]" />
                  <input value={modIvaoUrl} onChange={e => setModIvaoUrl(e.target.value)} placeholder={report.ivaoUrl || 'IVAO URL'}
                    className="bg-transparent border-b border-[#1d3461] p-1 text-white text-[10px] font-mono focus:outline-none focus:border-cyan-500 placeholder:text-[#333d55]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleModify(report.id)} disabled={processing}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-all disabled:opacity-50">
                    Save Changes
                  </button>
                  <button onClick={() => { setModifyingId(null); setModIvaoUrl(''); setModPirepId(''); }}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase text-[#8892b0] border border-[#1d3461] cursor-pointer hover:text-white bg-transparent transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Review mode */}
            {reviewingId === report.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <MessageSquare size={10} className="text-[#8892b0]" />
                  <input type="text" value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Admin comment (optional, sent to pilot on reject)..."
                    className="flex-1 bg-transparent border-b border-[#1d3461] p-1 text-white text-[10px] focus:outline-none focus:border-accent-gold placeholder:text-[#333d55]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(report.id, 'approve')} disabled={processing}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#2DCE89] bg-[#2DCE89]/10 border border-[#2DCE89]/20 cursor-pointer hover:bg-[#2DCE89]/20 transition-all disabled:opacity-50">
                    {processing ? <Loader2 size={10} className="animate-spin mx-auto" /> : '✓ Approve'}
                  </button>
                  <button onClick={() => handleReview(report.id, 'reject')} disabled={processing}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-all disabled:opacity-50">
                    {processing ? <Loader2 size={10} className="animate-spin mx-auto" /> : '✕ Reject'}
                  </button>
                  <button onClick={() => { setReviewingId(null); setComment(''); }}
                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#8892b0] border border-[#1d3461] cursor-pointer hover:text-white transition-all bg-transparent">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setReviewingId(report.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-accent-gold bg-accent-gold/5 border border-accent-gold/15 cursor-pointer hover:bg-accent-gold/10 transition-all">
                  Review
                </button>
                <button onClick={() => { setModifyingId(report.id); setModPirepId(report.pirepId); setModIvaoUrl(report.ivaoUrl); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/5 border border-cyan-500/15 cursor-pointer hover:bg-cyan-500/10 transition-all">
                  <Pencil size={9} className="inline mr-1" />Modify
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Tour System Page ──────────────────────────────────────

export default function TourSystem({ pilotId, pilotName }: { pilotId: string; pilotName: string }) {
  const [tours, setTours] = useState<TourDefinition[]>([]);
  const [selectedTour, setSelectedTour] = useState<TourDefinition | null>(null);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const [pendingReports, setPendingReports] = useState<LegReport[]>([]);
  const [activeLeg, setActiveLeg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  const loadTours = useCallback(async () => {
    setLoading(true);
    const data = await fetchTours();
    setTours(data);
    if (data.length > 0 && !selectedTour) setSelectedTour(data[0]);
    setLoading(false);
  }, [selectedTour]);

  useEffect(() => { loadTours(); }, [loadTours]);

  useEffect(() => {
    if (!selectedTour || !pilotId) return;
    fetchTourProgress(selectedTour.tourId, pilotId).then(setProgress);
    fetchPendingReports(selectedTour.tourId).then(setPendingReports);
  }, [selectedTour, pilotId]);

  const handleLegSubmitted = (report: LegReport) => {
    setProgress(prev => prev ? { ...prev, legs: [...prev.legs, report] } : prev);
    if (selectedTour) fetchPendingReports(selectedTour.tourId).then(setPendingReports);
  };

  const handleReviewed = () => {
    if (selectedTour) {
      fetchTourProgress(selectedTour.tourId, pilotId).then(setProgress);
      fetchPendingReports(selectedTour.tourId).then(setPendingReports);
    }
  };

  const selectedLeg = selectedTour?.legs.find(l => l.legNumber === activeLeg) ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 size={24} className="text-accent-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {tours.map(t => (
            <button key={t.id} onClick={() => { setSelectedTour(t); setActiveLeg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                selectedTour?.id === t.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'border-[#1d3461] text-[#8892b0] hover:text-white'
              }`}
              style={selectedTour?.id !== t.id ? { background: '#0d1f38' } : {}}>
              {t.tourId}
            </button>
          ))}
          {tours.length === 0 && <span className="text-xs text-[#8892b0]">No tours yet</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreator(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-accent-gold bg-accent-gold/5 border border-accent-gold/15 cursor-pointer hover:bg-accent-gold/10 transition-all">
            <Plus size={10} /> {showCreator ? 'Hide Creator' : 'Create Tour'}
          </button>
          <button onClick={() => setShowAdmin(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-accent-gold bg-accent-gold/5 border border-accent-gold/15 cursor-pointer hover:bg-accent-gold/10 transition-all">
            <Shield size={10} /> {showAdmin ? 'Hide Queue' : 'Admin Queue'}
          </button>
        </div>
      </div>

      {/* Admin Tour Creator */}
      {showCreator && (
        <AdminTourCreator onCreated={() => { loadTours(); setShowCreator(false); }} />
      )}

      {/* Admin Validation Queue */}
      {showAdmin && selectedTour && (
        <AdminValidationQueue reports={pendingReports} totalLegs={selectedTour.totalLegs} onReviewed={handleReviewed} />
      )}

      {selectedTour && (
        <>
          <TourStatusCard progress={progress} tour={selectedTour} />

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <LegTracker
              legs={selectedTour.legs}
              reports={progress?.legs ?? []}
              activeLeg={activeLeg}
              onSelectLeg={setActiveLeg}
              tourDescription={selectedTour.description}
            />

            {selectedLeg ? (
              <TourReportForm
                tourId={selectedTour.tourId}
                tourName={selectedTour.name}
                totalLegs={selectedTour.totalLegs}
                leg={selectedLeg}
                pilotId={pilotId}
                pilotName={pilotName}
                onSubmitted={handleLegSubmitted}
              />
            ) : (
              <div className="rounded-2xl border border-[#1d3461] flex flex-col items-center justify-center gap-3 p-8" style={{ background: '#0A192F' }}>
                <Map size={28} className="text-[#333d55]" />
                <p className="text-xs text-[#8892b0] text-center">Select a leg from the tracker to submit a report</p>
                <p className="text-[10px] text-[#333d55] font-mono uppercase tracking-wider text-center">
                  Legs unlock sequentially after admin approval
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedTour && !showCreator && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
          <Map size={32} className="text-[#333d55]" />
          <p className="text-sm text-[#8892b0]">No tours available yet</p>
          <button onClick={() => setShowCreator(true)}
            className="text-[10px] font-bold uppercase tracking-wider text-accent-gold hover:text-accent-gold/80 transition-colors bg-transparent border-none cursor-pointer">
            + Create your first tour
          </button>
        </div>
      )}
    </div>
  );
}
