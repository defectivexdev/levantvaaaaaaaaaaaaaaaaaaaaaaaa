'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Check, Clock, Award } from 'lucide-react';
import Link from 'next/link';

interface ActivityDetailProps {
    activityId: string;
}

export default function ActivityDetail({ activityId }: ActivityDetailProps) {
    const [activity, setActivity] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [interests, setInterests] = useState<any[]>([]);
    const [isInterested, setIsInterested] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activityId]);

    const fetchData = async () => {
        try {
            const [actRes, progRes, intRes] = await Promise.all([
                fetch(`/api/activities/${activityId}`),
                fetch(`/api/activities/${activityId}/progress`),
                fetch(`/api/activities/${activityId}/interest`)
            ]);
            
            const actData = await actRes.json();
            const progData = await progRes.json();
            const intData = await intRes.json();
            
            setActivity(actData);
            setProgress(progData);
            setInterests(intData);
            
            // Check if current user is interested (needs user ID comparison)
            // For now, this is handled server-side
        } catch (err) {
            console.error('Error fetching activity:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleInterest = async () => {
        try {
            const method = isInterested ? 'DELETE' : 'POST';
            await fetch(`/api/activities/${activityId}/interest`, { method });
            setIsInterested(!isInterested);
            fetchData(); // Refresh
        } catch (err) {
            console.error('Error toggling interest:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!activity) {
        return <div className="text-center text-gray-400 py-12">Activity not found</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Back Link */}
            <Link href="/portal/activities" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Tours & Events
            </Link>

            {/* Header */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="md:col-span-2 glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded ${
                            activity.type === 'Tour' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                        }`}>
                            {activity.type}
                        </span>
                        {activity.status?.ribbonText && (
                            <span className="flex items-center gap-2 text-xs bg-[#111] px-3 py-1 rounded">
                                {activity.status.showLiveTag && (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                                        LIVE
                                    </span>
                                )}
                                {activity.status.ribbonText}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">{activity.title}</h1>
                    <div className="prose prose-invert max-w-none text-gray-300" 
                         dangerouslySetInnerHTML={{ __html: activity.description }} />
                </div>

                {/* Banner */}
                <div className="glass-card overflow-hidden">
                    {activity.banner ? (
                        <img 
                            src={`/uploads/activities/${activity.banner}`} 
                            alt={activity.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="h-64 bg-gradient-to-br from-accent-gold/20 to-dark-700 flex items-center justify-center text-8xl opacity-30">
                            {activity.type === 'Tour' ? '🗺️' : '📅'}
                        </div>
                    )}
                </div>
            </div>

            {/* Details Grid */}
            <div className={`grid gap-6 ${activity.type === 'Event' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {/* Stats Panel */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent-gold" />
                        {activity.type} Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Start Date</span>
                            <span className="text-white">{formatDate(activity.startDate)} UTC</span>
                        </div>
                        {activity.endDate && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">End Date</span>
                                <span className="text-white">{formatDate(activity.endDate)} UTC</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-400">Legs In Order</span>
                            <span className="text-white">{activity.legsInOrder ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Minimum Rank</span>
                            <span className="text-white">{activity.minRank || 'Any'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Legs</span>
                            <span className="text-white">{activity.activityLegs?.length || 0}</span>
                        </div>
                        {activity.reward && (
                            <>
                                {activity.reward.badge && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Badge Reward</span>
                                        <span className="text-accent-gold">{activity.reward.badge.name}</span>
                                    </div>
                                )}
                                {activity.reward.points > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Points Reward</span>
                                        <span className="text-accent-gold">{activity.reward.points} pts</span>
                                    </div>
                                )}
                            </>
                        )}
                        {activity.bonusXp > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Bonus XP</span>
                                <span className="text-accent-gold">{activity.bonusXp}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Panel */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent-gold" />
                        Your Progress
                    </h3>
                    {progress?.started ? (
                        <div className="space-y-4">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Progress</span>
                                    <span className="text-white font-bold">{progress.percentComplete}%</span>
                                </div>
                                <div className="h-3 bg-[#111] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-accent-gold to-yellow-400 transition-all"
                                        style={{ width: `${progress.percentComplete}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Legs Complete</span>
                                    <span className="text-white">{progress.legsComplete}</span>
                                </div>
                                {progress.lastLegFlownDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Last Flown</span>
                                        <span className="text-white">{formatDate(progress.lastLegFlownDate)}</span>
                                    </div>
                                )}
                                {progress.dateComplete && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Completed</span>
                                        <span className="text-green-400">{formatDate(progress.dateComplete)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">You haven't started this {activity.type.toLowerCase()} yet. Fly a leg to begin tracking!</p>
                    )}
                </div>

                {/* Interest Panel (Events only) */}
                {activity.type === 'Event' && (
                    <div className="glass-card p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-accent-gold" />
                            Interest ({interests.length})
                        </h3>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                            {interests.length > 0 ? (
                                interests.map((interest: any) => (
                                    <div key={interest._id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#111] rounded-full flex items-center justify-center text-gray-400">
                                            {interest.pilot?.profileImage ? (
                                                <img src={`/uploads/profiles/${interest.pilot.profileImage}`} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <Users className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-white">{interest.pilot?.firstName}</span>
                                            <span className="text-gray-500 ml-2">{interest.pilot?.callsign}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">No one has shown interest yet.</p>
                            )}
                        </div>
                        <button 
                            onClick={toggleInterest}
                            className={`w-full mt-4 py-2 rounded font-bold text-sm transition-colors ${
                                isInterested 
                                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                        >
                            {isInterested ? 'Remove Interest' : 'Show Interest'}
                        </button>
                    </div>
                )}
            </div>

            {/* Legs Table */}
            <div className="glass-card p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent-gold" />
                    {activity.type} Legs
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b border-white/10">
                                <th className="pb-3">#</th>
                                <th className="pb-3">Depart</th>
                                <th className="pb-3">Arrive</th>
                                <th className="pb-3">Flight #</th>
                                <th className="pb-3">Aircraft</th>
                                <th className="pb-3 text-center">Completed</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.activityLegs?.map((leg: any, idx: number) => {
                                const isComplete = progress?.completedLegIds?.includes(leg._id);
                                return (
                                    <tr key={leg._id} className="border-b border-white/[0.06]">
                                        <td className="py-3 text-gray-400">{idx + 1}</td>
                                        <td className="py-3 text-white font-mono">{leg.departure_icao || 'Any'}</td>
                                        <td className="py-3 text-white font-mono">{leg.arrival_icao || 'Any'}</td>
                                        <td className="py-3 text-gray-300">{leg.flight_number || 'Any'}</td>
                                        <td className="py-3 text-gray-300">{leg.aircraft || 'Any'}</td>
                                        <td className="py-3 text-center">
                                            {isComplete && <Check className="w-5 h-5 text-green-400 mx-auto" />}
                                        </td>
                                        <td className="py-3 text-right">
                                            <Link 
                                                href={`/portal/dispatch?dep=${leg.departure_icao}&arr=${leg.arrival_icao}&aircraft=${leg.aircraft}&activityId=${activityId}`}
                                                className="bg-accent-gold hover:bg-yellow-500 text-dark-900 px-3 py-1 rounded text-xs font-bold transition-colors"
                                            >
                                                Dispatch
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leaderboard */}
            {activity.leaderboard?.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-accent-gold" />
                        {activity.type} History
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-white/10">
                                    <th className="pb-3"></th>
                                    <th className="pb-3">Callsign</th>
                                    <th className="pb-3">Name</th>
                                    <th className="pb-3">Progress</th>
                                    <th className="pb-3">Legs</th>
                                    <th className="pb-3">Completed</th>
                                    {activity.type === 'Tour' && <th className="pb-3">Days</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {activity.leaderboard.map((entry: any, idx: number) => (
                                    <tr key={entry._id} className="border-b border-white/[0.06]">
                                        <td className="py-3">
                                            {entry.pilot?.profileImage ? (
                                                <img src={`/uploads/profiles/${entry.pilot.profileImage}`} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 bg-[#111] rounded-full flex items-center justify-center text-gray-500">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 text-accent-gold font-mono">{entry.pilot?.pilotId}</td>
                                        <td className="py-3 text-white">{entry.pilot?.firstName}</td>
                                        <td className="py-3">
                                            <div className="w-24 h-2 bg-[#111] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-accent-gold"
                                                    style={{ width: `${entry.percentComplete}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-300">{entry.legsComplete}</td>
                                        <td className="py-3 text-gray-300">
                                            {entry.dateComplete ? formatDate(entry.dateComplete) : '-'}
                                        </td>
                                        {activity.type === 'Tour' && (
                                            <td className="py-3 text-gray-300">{entry.daysToComplete || '-'}</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
