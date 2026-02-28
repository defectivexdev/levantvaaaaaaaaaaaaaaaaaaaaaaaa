'use client';

import { useState, useEffect } from 'react';
import { Plane, RefreshCw, CheckCircle, AlertCircle, Loader2, XCircle, Calendar, MapPin, Settings2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function BookFlightPage() {
    const [loading, setLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState<Msg>(null);
    const [bid, setBid] = useState<any>(null);
    const [hasActiveFlight, setHasActiveFlight] = useState(false);
    const [simbriefId, setSimbriefId] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/auth/me').then(r => r.json()).catch(() => ({ user: null })),
            fetch('/api/portal/simbrief-to-bid').then(r => r.json()).catch(() => ({ bid: null })),
        ]).then(([meData, bidData]) => {
            if (meData.user?.simbriefId) setSimbriefId(meData.user.simbriefId);
            if (bidData.bid) {
                setBid(bidData.bid);
                setHasActiveFlight(bidData.hasActiveFlight || false);
            }
        }).finally(() => setPageLoading(false));
    }, []);

    const handleFetchSimBrief = async () => {
        setMessage(null);
        setLoading(true);
        
        try {
            const res = await fetch('/api/portal/simbrief-to-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await res.json();
            
            if (res.ok && data.bid) {
                setBid(data.bid);
                setHasActiveFlight(false);
                setMessage({ 
                    type: 'success', 
                    text: `Flight plan loaded successfully! Open ACARS to begin your flight.` 
                });
                toast.success('Flight plan loaded successfully');
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to fetch SimBrief' });
                toast.error(data.error || 'Failed to fetch SimBrief');
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelFlight = async () => {
        if (!confirm(hasActiveFlight 
            ? 'This will cancel your bid AND stop any active flight in ACARS. Are you sure?' 
            : 'Cancel this flight plan?'
        )) return;

        setCancelling(true);
        setMessage(null);

        try {
            const res = await fetch('/api/portal/simbrief-to-bid', { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                setBid(null);
                setHasActiveFlight(false);
                setMessage({ type: 'success', text: 'Flight cancelled successfully.' });
                toast.success('Flight cancelled successfully');
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to cancel flight.' });
                toast.error(data?.error || 'Failed to cancel flight');
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
            toast.error('Network error. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-white/10 p-8">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="relative flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Plane className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Book Flight</h1>
                                <p className="text-gray-400 text-sm">Import your SimBrief flight plan</p>
                            </div>
                        </div>
                    </div>
                    {bid && (
                        <button
                            onClick={handleCancelFlight}
                            disabled={cancelling}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/10"
                        >
                            {cancelling ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                            Cancel Flight
                        </button>
                    )}
                </div>
            </div>

            {/* Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium shadow-lg ${
                            message.type === 'success' 
                                ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 text-emerald-400' 
                                : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 text-red-400'
                        }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 shrink-0" />
                        )}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Bid Card */}
            {bid && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden bg-[#0a0a0a] border-2 border-cyan-500/30 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl" />
                    <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Active Flight Plan</h3>
                            </div>
                            {hasActiveFlight && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                                    In Flight
                                </span>
                            )}
                            {!hasActiveFlight && bid.status === 'Active' && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/20">
                                    Ready
                                </span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 space-y-1">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Callsign</p>
                                <p className="text-white font-mono font-bold text-lg">{bid.callsign}</p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 space-y-1">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Route</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-mono font-bold text-lg">{bid.departureIcao}</p>
                                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                                    <p className="text-white font-mono font-bold text-lg">{bid.arrivalIcao}</p>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 space-y-1">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Aircraft</p>
                                <p className="text-white font-mono font-bold text-lg">{bid.aircraftType}</p>
                            </div>
                            {bid.route && (
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 space-y-1 col-span-2">
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Route String</p>
                                    <p className="text-white font-mono text-sm whitespace-pre-wrap break-words">{bid.route}</p>
                                </div>
                            )}
                        </div>
                        
                        {hasActiveFlight && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                                <p className="text-xs text-amber-400 font-medium">
                                    ⚠️ This flight is currently being tracked in ACARS. Cancelling will stop the flight on both web and ACARS.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Main Card */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Instructions Card */}
                <div className="bg-[#0a0a0a] rounded-3xl border border-white/[0.08] p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-black text-white">How It Works</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-cyan-400">1</span>
                            </div>
                            <p className="text-sm text-gray-300">
                                Create a flight plan on <a href="https://simbrief.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 font-semibold underline decoration-cyan-400/30 hover:decoration-cyan-400">SimBrief.com</a>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-cyan-400">2</span>
                            </div>
                            <p className="text-sm text-gray-300">
                                Click <span className="font-semibold text-white">"Import Flight Plan"</span> to load your latest SimBrief flight plan
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-cyan-400">3</span>
                            </div>
                            <p className="text-sm text-gray-300">
                                Open <span className="font-semibold text-white">ACARS app</span> and click <span className="font-semibold text-white">"Fetch Bid"</span> to load the flight plan
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-cyan-400">4</span>
                            </div>
                            <p className="text-sm text-gray-300">
                                Click <span className="font-semibold text-white">"Start Flight"</span> in ACARS to begin tracking
                            </p>
                        </div>
                    </div>
                </div>

                {/* Import Card */}
                <div className="bg-[#0a0a0a] rounded-3xl border border-white/[0.08] p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <Settings2 className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-black text-white">Import Flight Plan</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {simbriefId && (
                            <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/30 rounded-2xl p-4">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">SimBrief ID</p>
                                <p className="text-cyan-400 font-mono font-bold text-lg">{simbriefId}</p>
                            </div>
                        )}
                        
                        {!pageLoading && !simbriefId && (
                            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-400 mb-1">SimBrief ID Required</p>
                                        <p className="text-xs text-amber-400/80">
                                            Please configure your SimBrief ID in <a href="/portal/settings" className="underline hover:text-amber-300 font-semibold">Settings</a> first.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={handleFetchSimBrief}
                            disabled={loading || !simbriefId || pageLoading}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-base tracking-wide uppercase flex items-center justify-center gap-3 cursor-pointer border-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-2xl hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {pageLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Loading...
                                </>
                            ) : loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Importing...
                                </>
                            ) : bid ? (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Re-Import Flight Plan
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Import Flight Plan
                                </>
                            )}
                        </button>
                        
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                            <p className="text-xs text-blue-400/80">
                                💡 <span className="font-semibold">Tip:</span> Make sure you have an active flight plan on SimBrief before importing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
