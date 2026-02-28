'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, X, Plane, MapPin, AlertCircle, Loader2, Award, Send, CheckCircle, Clock, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function TourDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tourId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [tour, setTour] = useState<any>(null);
    const [userReports, setUserReports] = useState<any[]>([]);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tourRes, reportsRes] = await Promise.all([
                    fetch(`/api/admin/tours?id=${tourId}`),
                    fetch(`/api/portal/tour-reports?tourId=${tourId}`)
                ]);
                const tourData = await tourRes.json();
                const reportsData = await reportsRes.json();
                
                if (tourData.tours?.[0]) {
                    setTour(tourData.tours[0]);
                }
                setUserReports(reportsData.reports || []);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        }
        
        if (tourId) fetchData();
    }, [tourId]);

    const handleSubmitReport = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/portal/tour-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tourId: tour._id,
                    legs: tour.legs.map((leg: any, idx: number) => ({
                        leg_number: idx + 1,
                        departure_icao: leg.departure_icao,
                        arrival_icao: leg.arrival_icao,
                    }))
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                toast.success(`Report submitted! ${data.report.completed_legs}/${data.report.total_legs} legs verified.`);
                setShowSubmitModal(false);
                window.location.reload();
            } else {
                toast.error(data.error || 'Failed to submit report');
            }
        } catch (error) {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const latestReport = userReports[0];
    const hasActiveReport = latestReport && ['Pending', 'NeedsModification'].includes(latestReport.status);
    const isCompleted = latestReport?.status === 'Approved';

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin w-12 h-12 text-cyan-400" />
        </div>
    );
    if (!tour) return (
        <div className="p-12 text-center text-red-500">Tour not found</div>
    );

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <Link
                href="/portal/tours"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Tours
            </Link>

            {/* Hero Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative h-80 rounded-3xl overflow-hidden border-2 border-white/[0.08]"
            >
                {tour.banner || tour.image ? (
                    <img src={tour.banner || tour.image} alt={tour.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                            tour.difficulty === 'easy' ? 'bg-green-500/90 text-white' :
                            tour.difficulty === 'hard' ? 'bg-red-500/90 text-white' :
                            'bg-yellow-500/90 text-black'
                        }`}>
                            {tour.difficulty}
                        </span>
                        {isCompleted && (
                            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md shadow-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                            </span>
                        )}
                        {hasActiveReport && (
                            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/90 text-white backdrop-blur-md shadow-lg flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {latestReport.status === 'Pending' ? 'Under Review' : 'Needs Changes'}
                            </span>
                        )}
                    </div>
                    <h1 className="text-5xl font-black text-white mb-3">{tour.name}</h1>
                    <p className="text-gray-200 text-lg max-w-3xl">{tour.description}</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Rewards Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl p-6 space-y-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                                <Award className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Rewards</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-4">
                                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Credits</p>
                                <p className="text-3xl font-black text-emerald-400">{tour.reward_credits?.toLocaleString()}</p>
                            </div>

                            {tour.award_image && (
                                <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-4 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Award Badge</p>
                                    <img
                                        src={tour.award_image}
                                        alt="Award"
                                        className="w-20 h-20 mx-auto object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Stats Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl p-6 space-y-4"
                    >
                        <h3 className="text-lg font-bold text-white">Tour Info</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Total Legs</span>
                                <span className="text-white font-bold">{tour.legs?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Distance</span>
                                <span className="text-white font-bold">{tour.total_distance || 0} nm</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Difficulty</span>
                                <span className={`font-bold ${
                                    tour.difficulty === 'easy' ? 'text-green-400' :
                                    tour.difficulty === 'hard' ? 'text-red-400' :
                                    'text-yellow-400'
                                }`}>{tour.difficulty.toUpperCase()}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Button */}
                    {!isCompleted && !hasActiveReport && (
                        <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-base uppercase tracking-wide bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Send className="w-5 h-5" />
                            Submit Completion
                        </motion.button>
                    )}

                    {/* Rules Link */}
                    <Link
                        href="/portal/tours/rules"
                        className="block text-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-cyan-400 hover:text-cyan-300 transition-all"
                    >
                        <BookOpen className="w-4 h-4 inline mr-2" />
                        Tour Rules
                    </Link>
                </div>

                {/* Legs List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-[#0a0a0a] border-2 border-white/[0.08] rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white">Flight Legs</h3>
                    </div>

                    <div className="space-y-4">
                        {tour.legs.map((leg: any, idx: number) => {
                            const legReport = latestReport?.legs?.find((l: any) => l.leg_number === idx + 1);
                            const isVerified = legReport?.completed && legReport?.flight_id;

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`relative p-6 rounded-2xl border-2 transition-all ${
                                        isVerified
                                            ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30'
                                            : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            {/* Leg Number */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                                                isVerified
                                                    ? 'bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400'
                                                    : 'bg-white/5 border-2 border-white/10 text-gray-400'
                                            }`}>
                                                {isVerified ? <Check className="w-6 h-6" /> : idx + 1}
                                            </div>

                                            {/* Route Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl font-black font-mono text-white">{leg.departure_icao}</span>
                                                    <Plane className="w-5 h-5 text-cyan-400" />
                                                    <span className="text-2xl font-black font-mono text-white">{leg.arrival_icao}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-gray-400">
                                                        <span className="font-semibold text-white">{leg.distance_nm}</span> nm
                                                    </span>
                                                    {isVerified && legReport.flight_date && (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Verified {new Date(legReport.flight_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {isVerified && (
                                            <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase">
                                                Completed
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Report Status */}
                    {latestReport && (
                        <div className="mt-8 pt-8 border-t border-white/[0.08]">
                            <h4 className="text-lg font-bold text-white mb-4">Your Submission</h4>
                            <div className={`p-6 rounded-2xl border-2 ${
                                latestReport.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                latestReport.status === 'Rejected' ? 'bg-red-500/10 border-red-500/30' :
                                latestReport.status === 'NeedsModification' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                'bg-blue-500/10 border-blue-500/30'
                            }`}>
                                <div className="flex items-center gap-3 mb-3">
                                    {latestReport.status === 'Approved' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                                    {latestReport.status === 'Rejected' && <X className="w-6 h-6 text-red-400" />}
                                    {latestReport.status === 'Pending' && <Clock className="w-6 h-6 text-blue-400" />}
                                    {latestReport.status === 'NeedsModification' && <AlertCircle className="w-6 h-6 text-yellow-400" />}
                                    <span className={`text-lg font-bold ${
                                        latestReport.status === 'Approved' ? 'text-emerald-400' :
                                        latestReport.status === 'Rejected' ? 'text-red-400' :
                                        latestReport.status === 'NeedsModification' ? 'text-yellow-400' :
                                        'text-blue-400'
                                    }`}>
                                        {latestReport.status === 'NeedsModification' ? 'Needs Modification' : latestReport.status}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm mb-2">
                                    Submitted: {new Date(latestReport.submitted_at).toLocaleString()}
                                </p>
                                <p className="text-gray-300 text-sm">
                                    Verified Legs: {latestReport.completed_legs}/{latestReport.total_legs}
                                </p>
                                {latestReport.admin_notes && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Admin Notes</p>
                                        <p className="text-white text-sm">{latestReport.admin_notes}</p>
                                    </div>
                                )}
                                {latestReport.modification_notes && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-xs text-yellow-400 uppercase font-semibold mb-1">Required Changes</p>
                                        <p className="text-white text-sm">{latestReport.modification_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSubmitModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a0a] rounded-3xl border-2 border-white/[0.08] p-8 max-w-md w-full"
                        >
                            <h3 className="text-2xl font-black text-white mb-4">Submit Tour Completion</h3>
                            <p className="text-gray-400 mb-6">
                                This will submit your tour for admin validation. The system will automatically verify your flights for each leg.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitReport}
                                    disabled={submitting}
                                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
