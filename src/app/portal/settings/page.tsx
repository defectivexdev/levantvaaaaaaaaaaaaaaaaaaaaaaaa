'use client';

import { useState, useEffect } from 'react';
import { Settings, Lock, Eye, EyeOff, Check, AlertCircle, Plane, Globe, Radio, Loader2, Save, CheckCircle, Wifi, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Msg = { type: 'success' | 'error'; text: string } | null;

function Toast({ msg, onClear }: { msg: Msg; onClear: () => void }) {
    useEffect(() => { if (msg) { const t = setTimeout(onClear, 4000); return () => clearTimeout(t); } }, [msg, onClear]);
    if (!msg) return null;
    return (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
        >
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {msg.text}
        </motion.div>
    );
}

export default function SettingsPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Msg>(null);
    
    const [simbriefId, setSimbriefId] = useState('');
    const [hoppieCode, setHoppieCode] = useState('');
    const [simMode, setSimMode] = useState<'fsuipc' | 'xpuipc'>('fsuipc');
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kgs'>('lbs');
    const [vatsimId, setVatsimId] = useState('');
    const [ivaoId, setIvaoId] = useState('');
    const [country, setCountry] = useState('');
    const [countries, setCountries] = useState<Array<{code: string; name: string; flag: string}>>([]);
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [integrationsLoading, setIntegrationsLoading] = useState(false);
    const [integrationsMessage, setIntegrationsMessage] = useState<Msg>(null);

    useEffect(() => {
        // Fetch countries
        fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags')
            .then(res => res.json())
            .then(data => {
                const formattedCountries = data
                    .map((c: any) => ({
                        code: c.cca2,
                        name: c.name.common,
                        flag: c.flags.svg || c.flags.png
                    }))
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));
                setCountries(formattedCountries);
            })
            .catch(() => {});

        // Fetch user data
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    if (data.user.simbriefId) setSimbriefId(data.user.simbriefId);
                    if (data.user.hoppieCode) setHoppieCode(data.user.hoppieCode);
                    if (data.user.simMode) setSimMode(data.user.simMode);
                    if (data.user.weightUnit) setWeightUnit(data.user.weightUnit);
                    if (data.user.vatsim_cid) setVatsimId(data.user.vatsim_cid);
                    if (data.user.ivao_vid) setIvaoId(data.user.ivao_vid);
                    if (data.user.country) setCountry(data.user.country);
                }
            })
            .catch(() => {});
    }, []);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'New passwords do not match' }); return; }
        if (newPassword.length < 8) { setMessage({ type: 'error', text: 'New password must be at least 8 characters' }); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch { setMessage({ type: 'error', text: 'An error occurred. Please try again.' }); }
        finally { setLoading(false); }
    };

    const handleIntegrationsSave = async () => {
        setIntegrationsMessage(null);
        setIntegrationsLoading(true);
        try {
            // Save all integrations in parallel (only save country if it has a value)
            const requests = [
                fetch('/api/settings/simbrief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ simbriefId }) }),
                fetch('/api/settings/acars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hoppieCode, simMode, weightUnit }) }),
                fetch('/api/settings/network-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vatsimId, ivaoId }) }),
            ];
            
            // Only save country if it has a value
            if (country) {
                requests.push(fetch('/api/settings/country', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country }) }));
            }
            
            const responses = await Promise.all(requests);
            const [simbriefRes, acarsRes, networkRes, countryRes] = responses;

            // Check if all responses are ok (countryRes is optional)
            const allOk = simbriefRes.ok && acarsRes.ok && networkRes.ok && (!countryRes || countryRes.ok);
            
            if (allOk) {
                setIntegrationsMessage({ type: 'success', text: 'All settings saved successfully! Restart ACARS to apply changes.' });
            } else {
                setIntegrationsMessage({ type: 'error', text: 'Some settings failed to save. Please try again.' });
            }
        } catch {
            setIntegrationsMessage({ type: 'error', text: 'An error occurred while saving settings.' });
        } finally {
            setIntegrationsLoading(false);
        }
    };

    const inputCls = "w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none transition-colors";

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-accent-gold" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-gray-500 text-xs">Manage your integrations & security</p>
                </div>
            </div>

            {/* Integrations - Combined Section */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Wifi className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">SimBrief / ACARS / Network</h2>
                </div>
                <div className="p-6 space-y-6">
                    <AnimatePresence><Toast msg={integrationsMessage} onClear={() => setIntegrationsMessage(null)} /></AnimatePresence>
                    
                    {/* SimBrief */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Plane className="w-4 h-4 text-amber-500" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">SimBrief</h3>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Pilot ID</label>
                            <input type="text" value={simbriefId} onChange={e => setSimbriefId(e.target.value)} placeholder="" className={inputCls} />
                            <p className="text-[10px] text-gray-600 mt-1.5">simbrief.com → Account Settings → Pilot ID</p>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-6" />

                    {/* ACARS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Radio className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ACARS</h3>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Hoppie Logon Code</label>
                            <input type="password" value={hoppieCode} onChange={e => setHoppieCode(e.target.value)} placeholder="" className={inputCls} />
                            <p className="text-[10px] text-gray-600 mt-1.5">Required for CPDLC / ACARS messaging via Hoppie network</p>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Weight Unit</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setWeightUnit('lbs')}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${weightUnit === 'lbs' ? 'bg-accent-gold/20 border-accent-gold/40 text-accent-gold' : 'bg-[#0a0a0a] border-white/10 text-gray-400 hover:border-white/20'}`}
                                >LBS</button>
                                <button type="button" onClick={() => setWeightUnit('kgs')}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${weightUnit === 'kgs' ? 'bg-accent-gold/20 border-accent-gold/40 text-accent-gold' : 'bg-[#0a0a0a] border-white/10 text-gray-400 hover:border-white/20'}`}
                                >KGS</button>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-1.5">Used across the portal for fuel, cargo, and payload values</p>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Simulator Mode</label>
                            <select value={simMode} onChange={e => setSimMode(e.target.value as any)}
                                className={`${inputCls} appearance-none cursor-pointer`}
                            >
                                <option value="fsuipc">FSUIPC (MSFS / P3D)</option>
                                <option value="xpuipc">XPUIPC (X-Plane Legacy)</option>
                            </select>
                            <p className="text-[10px] text-gray-600 mt-1.5">
                                {simMode === 'fsuipc' ? 'Microsoft Flight Simulator 2020/2024 or Prepar3D via FSUIPC' : 'X-Plane 11/12 via XPUIPC shared memory or TCP'}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-6" />

                    {/* Network */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-4 h-4 text-blue-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Network & Origin</h3>
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Country (Origin)</label>
                            <button
                                type="button"
                                onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-accent-gold/50 focus:outline-none transition-colors flex items-center justify-between"
                            >
                                {country ? (
                                    <span className="flex items-center gap-2">
                                        <img src={countries.find(c => c.code === country)?.flag} alt="" className="w-5 h-4 object-cover rounded" />
                                        {countries.find(c => c.code === country)?.name || country}
                                    </span>
                                ) : (
                                    <span className="text-gray-500">Select a country</span>
                                )}
                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {countryDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl max-h-64 overflow-hidden">
                                    <div className="max-h-64 overflow-y-auto">
                                        {countries.map(c => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => {
                                                    setCountry(c.code);
                                                    setCountryDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-white text-sm text-left transition-colors"
                                            >
                                                <img src={c.flag} alt="" className="w-6 h-4 object-cover rounded" />
                                                <span>{c.name}</span>
                                                <span className="text-gray-600 text-xs ml-auto">{c.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">VATSIM CID</label>
                                <input type="text" value={vatsimId} onChange={e => setVatsimId(e.target.value)} placeholder="" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">IVAO VID</label>
                                <input type="text" value={ivaoId} onChange={e => setIvaoId(e.target.value)} placeholder="" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    {/* Single Save Button */}
                    <button onClick={handleIntegrationsSave} disabled={integrationsLoading}
                        className="w-full flex items-center justify-center gap-2 bg-accent-gold hover:bg-accent-gold/80 text-dark-900 font-bold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 mt-6"
                    >
                        {integrationsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {integrationsLoading ? 'Saving All Settings...' : 'Save All Settings'}
                    </button>
                </div>
            </div>

            {/* Password */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Lock className="w-4 h-4 text-red-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Change Password</h2>
                </div>
                <div className="p-6">
                    <AnimatePresence><Toast msg={message} onClear={() => setMessage(null)} /></AnimatePresence>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-2">
                        {[
                            { label: 'Current Password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                            { label: 'New Password', value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew) },
                            { label: 'Confirm New Password', value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
                        ].map(field => (
                            <div key={field.label}>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">{field.label}</label>
                                <div className="relative">
                                    <input
                                        type={field.show ? 'text' : 'password'}
                                        value={field.value}
                                        onChange={e => field.set(e.target.value)}
                                        required
                                        minLength={field.label.includes('New') ? 8 : undefined}
                                        className={`${inputCls} pr-12`}
                                    />
                                    <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                        {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button type="submit" disabled={loading}
                            className="w-full bg-accent-gold hover:bg-accent-gold/80 text-dark-900 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
