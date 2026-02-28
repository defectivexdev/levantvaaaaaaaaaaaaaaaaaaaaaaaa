'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Shield, Save } from 'lucide-react';

interface StaffRole {
    _id: string;
    title: string;
    category: string;
    description: string;
    email: string;
    order: number;
    color: string;
}

interface StaffMember {
    _id: string;
    pilot: {
        _id: string;
        first_name: string;
        last_name: string;
        pilot_id: string;
        rank: string;
    };
    role: StaffRole;
    is_head: boolean;
    name?: string;
    callsign?: string;
    email?: string;
    picture?: string;
    discord?: string;
}

export default function AdminStaffPage() {
    const [members, setMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    
    // New Staff Form State
    const [pilotIdInput, setPilotIdInput] = useState('');
    const [memberDetails, setMemberDetails] = useState({ 
        roleTitle: '', 
        category: 'Board of Governor', 
        name: '', 
        email: '', 
        picture: '', 
        discord: '' 
    });
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/staff/members');
            const data = await res.json();
            if (data.success) setMembers(data.members);
        } catch (e) {
            console.error('Failed to fetch staff data', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setAssigning(true);
        try {
            const url = editingMemberId 
                ? `/api/staff/members/${editingMemberId}` 
                : '/api/staff/members';
            const method = editingMemberId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pilotId: pilotIdInput, 
                    ...memberDetails
                })
            });
            const data = await res.json();
            if (data.success) {
                if (editingMemberId) {
                    setMembers(members.map(m => m._id === editingMemberId ? data.member : m));
                } else {
                    setMembers([data.member, ...members]);
                }
                resetForm();
            } else {
                alert(data.error || 'Failed to process request');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        } finally {
            setAssigning(false);
        }
    };

    const resetForm = () => {
        setPilotIdInput('');
        setMemberDetails({ 
            roleTitle: '', 
            category: 'Board of Governor', 
            name: '', 
            email: '', 
            picture: '', 
            discord: '' 
        });
        setEditingMemberId(null);
    };

    const handleEdit = (member: StaffMember) => {
        setEditingMemberId(member._id);
        setPilotIdInput(member.pilot.pilot_id);
        setMemberDetails({
            roleTitle: member.role.title,
            category: member.role.category,
            name: member.name || '',
            email: member.email || '',
            picture: member.picture || '',
            discord: member.discord || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteMember = async (id: string) => {
        if (!confirm('Remove staff member?')) return;
        try {
            const res = await fetch(`/api/staff/members/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMembers(members.filter(m => m._id !== id));
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-12 max-w-5xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white font-display tracking-tight text-center">Staff Management</h1>
                <p className="text-gray-500 text-sm text-center">Manage your organization's team members.</p>
            </div>

            <div className="grid grid-cols-1 gap-12">
                
                {/* --- Add Staff Member Form --- */}
                <div className="space-y-6">
                    <div className="flex items-center justify-center gap-3 pb-2 border-b border-white/[0.06]">
                        <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center border border-emerald-400/20">
                            {editingMemberId ? <Save className="text-emerald-400" size={20} /> : <Plus className="text-emerald-400" size={20} />}
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {editingMemberId ? 'Edit Staff Member' : 'Add New Staff'}
                        </h2>
                    </div>

                    <form onSubmit={handleAddOrUpdateStaff} className="glass-card p-8 rounded-3xl space-y-8 border border-white/[0.08] bg-black/40 backdrop-blur-md text-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Pilot ID</label>
                                <input 
                                    type="text" placeholder="e.g. LVT001" 
                                    value={pilotIdInput} onChange={e => setPilotIdInput(e.target.value)}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm font-mono outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
                                    required
                                    disabled={!!editingMemberId}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Role Title</label>
                                <select 
                                    value={memberDetails.roleTitle} onChange={e => setMemberDetails({...memberDetails, roleTitle: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm outline-none focus:border-accent-gold/50 transition-all font-medium appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" className="text-black">Select Position...</option>
                                    <optgroup label="Board of Governor" className="text-black">
                                        <option value="Chief Executive Officer">Chief Executive Officer</option>
                                        <option value="Chief Operations Officer">Chief Operations Officer</option>
                                        <option value="Executive Vice President">Executive Vice President</option>
                                    </optgroup>
                                    <optgroup label="Director" className="text-black">
                                        <option value="Operations Director">Operations Director</option>
                                        <option value="Human Resources Director">Human Resources Director</option>
                                        <option value="Marketing Director">Marketing Director</option>
                                        <option value="IT Director">IT Director</option>
                                        <option value="Events Director">Events Director</option>
                                    </optgroup>
                                    <optgroup label="Chief Pilot" className="text-black">
                                        <option value="Chief Pilot Training">Chief Pilot Training</option>
                                        <option value="Chief Pilot Recruitment">Chief Pilot Recruitment</option>
                                        <option value="Senior Advisor">Senior Advisor</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Category</label>
                                <select 
                                    value={memberDetails.category} onChange={e => setMemberDetails({...memberDetails, category: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm outline-none transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="Board of Governor" className="text-black font-bold">Board of Governor</option>
                                    <option value="Director" className="text-black font-bold">Director</option>
                                    <option value="Chief Pilot" className="text-black font-bold">Chief Pilot</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Display Name Override</label>
                                <input 
                                    type="text" placeholder="Optional" 
                                    value={memberDetails.name} onChange={e => setMemberDetails({...memberDetails, name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm focus:border-white/20 transition-all placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/[0.06]">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Direct Email</label>
                                <input 
                                    type="email" placeholder="staff@levantva.com" 
                                    value={memberDetails.email} onChange={e => setMemberDetails({...memberDetails, email: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm focus:border-white/20 transition-all placeholder:text-gray-700"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Discord Handle</label>
                                <input 
                                    type="text" placeholder="@username" 
                                    value={memberDetails.discord} onChange={e => setMemberDetails({...memberDetails, discord: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm focus:border-[#5865F2]/50 transition-all placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-widest">Avatar URL</label>
                                <input 
                                    type="text" placeholder="https://..." 
                                    value={memberDetails.picture} onChange={e => setMemberDetails({...memberDetails, picture: e.target.value})}
                                    className="w-full bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-white text-sm placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            {editingMemberId && (
                                <button type="button" onClick={resetForm} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all">
                                    Cancel
                                </button>
                            )}
                            <button disabled={assigning} className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20">
                                {assigning ? 'Processing...' : (editingMemberId ? 'Update Member' : 'Add Staff Member')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- Current Staff List --- */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center border border-accent-gold/20">
                                <Users className="text-accent-gold" size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Current Team</h2>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{members.length} Members</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map(member => (
                            <motion.div 
                                key={member._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/[0.03] p-6 rounded-3xl flex items-center justify-between border border-white/[0.06] hover:border-white/10 group transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-black p-0.5 flex items-center justify-center border border-white/[0.08]">
                                        <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-900 flex items-center justify-center">
                                            {member.picture ? (
                                                <img src={member.picture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-gray-600 uppercase">{(member.name || member.pilot?.first_name)?.[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-tight">
                                            {member.name || `${member.pilot?.first_name} ${member.pilot?.last_name}`}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${member.role?.color}`}>{member.role?.title}</span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{member.role?.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(member)} className="text-gray-700 hover:text-accent-gold p-3 bg-white/0 hover:bg-accent-gold/10 rounded-2xl transition-all">
                                        <Save size={20} />
                                    </button>
                                    <button onClick={() => handleDeleteMember(member._id)} className="text-gray-700 hover:text-rose-400 p-3 bg-white/0 hover:bg-rose-400/10 rounded-2xl transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        
                        {members.length === 0 && !loading && (
                            <div className="col-span-full text-center py-20 border border-dashed border-white/[0.06] rounded-3xl bg-white/[0.01]">
                                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No Active Team Members</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
