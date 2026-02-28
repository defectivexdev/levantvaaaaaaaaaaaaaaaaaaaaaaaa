'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Clock, 
    Plane, 
    MapPin, 
    Fuel, 
    Navigation, 
    Users, 
    Package, 
    TrendingUp, 
    ChevronLeft,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Activity,
    ArrowRight,
    Star
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LandingAnalysis from '@/components/LandingAnalysis';
const FlightAnalysisChart = dynamic(() => import('@/components/FlightAnalysisChart'), { ssr: false });

export default function PirepDetailPage() {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const [rpt, setRpt] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        try {
            const res = await fetch(`/api/portal/reports/detail?id=${id}`);
            const data = await res.json();
            if (data.report) {
                setRpt(data.report);
            }
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px] text-accent-gold animate-pulse">Loading Report Details...</div>;
    if (!rpt) return <div className="p-8 text-center text-gray-400">Report not found</div>;

    const formatDuration = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                    Back to Reports
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                        rpt.approved_status === 1 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        rpt.approved_status === 2 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                        {rpt.approved_status === 1 ? 'Accepted' : rpt.approved_status === 2 ? 'Rejected' : 'Pending Review'}
                    </span>
                    <span className="text-gray-500 font-mono text-sm px-3 py-1.5 bg-white/5 rounded-lg border border-white/[0.08] uppercase tracking-widest">
                        {rpt.callsign || id}
                    </span>
                </div>
            </div>

            {/* Main Overview Card */}
            <div className="glass-card overflow-hidden relative">
                <div className="absolute top-0 right-0 p-32 bg-accent-gold/5 blur-[100px] rounded-full" />
                
                <div className="p-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        {/* Route Display */}
                        <div className="flex items-center gap-12 flex-1 justify-center md:justify-start">
                            <div className="text-center group">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Departure</p>
                                <h2 className="text-5xl font-display font-bold text-white group-hover:text-accent-gold transition-colors">{rpt.departure_icao}</h2>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2 flex-1 max-w-[200px]">
                                <p className="text-[10px] text-accent-gold/40 font-mono uppercase font-bold">{rpt.aircraft_type}</p>
                                <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#080808] px-2">
                                        <Plane className="w-5 h-5 text-accent-gold rotate-90" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 font-mono uppercase font-bold">{formatDuration(rpt.flight_time || 0)}</p>
                            </div>

                            <div className="text-center group">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Arrival</p>
                                <h2 className="text-5xl font-display font-bold text-white group-hover:text-accent-gold transition-colors">{rpt.arrival_icao}</h2>
                            </div>
                        </div>

                        {/* Economy/Score Summary */}
                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/[0.06] text-center min-w-[140px]">
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Flight Score</p>
                                <p className={`text-3xl font-bold ${rpt.score >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>{rpt.score || 100}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/[0.06] text-center min-w-[140px]">
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Net Profit</p>
                                <p className="text-3xl font-bold text-accent-gold">+{rpt.real_profit?.toLocaleString() || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TechnicalStat 
                    label="Landing Rate" 
                    value={`${rpt.landing_rate || 0} fpm`} 
                    icon={<Activity size={18} />} 
                    color={rpt.landing_rate > -150 ? 'text-green-400' : 'text-yellow-400'}
                />
                <TechnicalStat 
                    label="Distance Flown" 
                    value={`${rpt.distance || 0} NM`} 
                    icon={<Navigation size={18} />} 
                    color="text-purple-400"
                />
                <TechnicalStat 
                    label="Payload" 
                    value={`${rpt.pax || 0} PAX / ${rpt.cargo || 0}lbs`} 
                    icon={<Users size={18} />} 
                    color="text-orange-400"
                />
            </div>

            {/* Passenger Feedback Section */}
            {rpt.passenger_review && (
                <div className="glass-card p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-24 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="text-center md:text-left shrink-0">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Service Rating</p>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star 
                                        key={s} 
                                        size={20} 
                                        fill={s <= (rpt.passenger_rating || 0) ? '#eab308' : 'none'} 
                                        stroke={s <= (rpt.passenger_rating || 0) ? '#eab308' : '#333'} 
                                    />
                                ))}
                            </div>
                            <p className="mt-2 text-2xl font-display font-bold text-white">{(rpt.passenger_rating || 0).toFixed(1)} / 5.0</p>
                        </div>
                        <div className="flex-1 italic text-lg text-gray-300 relative">
                            <span className="absolute -top-4 -left-6 text-6xl text-white/5 font-serif">"</span>
                            {rpt.passenger_review}
                            <span className="absolute -bottom-10 -right-2 text-6xl text-white/5 font-serif rotate-180">"</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Flight Analysis Chart Section */}
            {rpt.telemetry && rpt.telemetry.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <FlightAnalysisChart data={rpt.telemetry} />
                </div>
            )}

            {/* Landing Analysis Component */}
            {rpt.log?.landingAnalysis && (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <LandingAnalysis rpt={rpt.log.landingAnalysis} />
                </div>
            )}

            {/* Detailed Flight Log Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-accent-gold" />
                        Flight Log Events
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="p-4 text-left">Event</th>
                                <th className="p-4 text-left">Time</th>
                                <th className="p-4 text-left">Deduction</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {rpt.deductions && rpt.deductions.length > 0 ? (
                                rpt.deductions.map((d: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-white text-sm">{d.reason}</td>
                                        <td className="p-4 text-gray-400 text-xs font-mono">{d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : 'N/A'}</td>
                                        <td className="p-4 text-red-400 font-mono text-sm">-{d.penalty} pts</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-gray-500 italic text-sm">No special events logged for this flight.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TechnicalStat({ label, value, icon, color }: any) {
    return (
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.06] hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-white/5 ${color} bg-opacity-10`}>
                    {icon}
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
        </div>
    );
}
