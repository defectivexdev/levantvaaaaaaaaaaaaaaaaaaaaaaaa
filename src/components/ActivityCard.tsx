'use client';
import Link from 'next/link';
import { Calendar, MapPin, Trophy, Users } from 'lucide-react';

interface ActivityCardProps {
    activity: {
        _id: string;
        title: string;
        banner?: string;
        type: 'Event' | 'Tour';
        startDate: string;
        endDate?: string;
        legCount: number;
        reward?: {
            badge?: { name: string };
            points: number;
        };
        status: {
            ribbonText: string | null;
            showLiveTag: boolean;
        };
    };
}

export default function ActivityCard({ activity }: ActivityCardProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <Link href={`/portal/activities/${activity._id}`}>
            <div className="glass-card overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer group relative">
                {/* Ribbon */}
                {activity.status.ribbonText && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-bold shadow-lg">
                        {activity.status.showLiveTag && (
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                                LIVE
                            </span>
                        )}
                        <span className="text-white">{activity.status.ribbonText}</span>
                    </div>
                )}
                
                {/* Banner */}
                <div className="h-40 bg-gradient-to-br from-accent-gold/20 to-dark-700 flex items-center justify-center">
                    {activity.banner ? (
                        <img 
                            src={`/uploads/activities/${activity.banner}`} 
                            alt={activity.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-6xl opacity-30">
                            {activity.type === 'Tour' ? '🗺️' : '📅'}
                        </div>
                    )}
                </div>
                
                {/* Content */}
                <div className="p-4">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            activity.type === 'Tour' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                        }`}>
                            {activity.type}
                        </span>
                        {activity.reward?.badge && (
                            <span className="text-xs bg-accent-gold/20 text-accent-gold px-2 py-0.5 rounded flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                Badge
                            </span>
                        )}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-accent-gold transition-colors">
                        {activity.title}
                    </h3>
                    
                    {/* Info */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(activity.startDate)}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {activity.legCount} legs
                        </span>
                        {(activity.reward?.points ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-accent-gold">
                                <Trophy className="w-3 h-3" />
                                {activity.reward?.points} pts
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
