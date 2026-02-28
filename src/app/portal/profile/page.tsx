'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    Clock, TrendingDown, Target, Zap, Plane, Calendar, Check, User, Shield,
    ChevronRight, Trophy, Medal, Camera, Loader2, Trash2, X, Award, MapPin, Star, Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface Pilot {
    pilot_id: string;
    first_name: string;
    last_name: string;
    email: string;
    rank: string;
    country: string;
    timezone: string;
    vatsim_cid?: string;
    ivao_vid?: string;
    simbrief_id?: string;
    avatar_url?: string;
    total_hours: number;
    transfer_hours: number;
    total_flights: number;
    total_credits: number;
    routes_flown?: string[];
    current_location: string;
    average_landing: number;
    status: string;
    created_at: string;
    email_opt_in: boolean;
    balance: number;
    hoppie_code?: string;
    sim_mode?: string;
}

interface Country {
    code: string;
    name: string;
    flag: string;
    timezones: string[];
}

interface PilotBadge {
    _id: string;
    award_id: {
        _id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        category?: string;
    };
    earned_at: string;
}

const RANKS = [
    { name: 'Cadet', hours: 0 },
    { name: 'Second Officer', hours: 25 },
    { name: 'First Officer', hours: 50 },
    { name: 'Senior First Officer', hours: 100 },
    { name: 'Captain', hours: 250 },
    { name: 'Senior Captain', hours: 500 },
    { name: 'Check Airman', hours: 1000 },
];

function getRankProgress(hours: number) {
    let currentRank = RANKS[0];
    let nextRank = RANKS[1];
    
    for (let i = 0; i < RANKS.length; i++) {
        if (hours >= RANKS[i].hours) {
            currentRank = RANKS[i];
            nextRank = RANKS[i + 1] || RANKS[i];
        }
    }
    
    if (currentRank === nextRank) return { currentRank, nextRank, progress: 100 };
    
    const progressInRank = hours - currentRank.hours;
    const hoursNeeded = nextRank.hours - currentRank.hours;
    const progress = Math.min((progressInRank / hoursNeeded) * 100, 100);
    
    return { currentRank, nextRank, progress };
}

export default function ProfilePage() {
    const [pilot, setPilot] = useState<Pilot | null>(null);
    const [loading, setLoading] = useState(true);
    const [flightHistory, setFlightHistory] = useState<any[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [pilotBadges, setPilotBadges] = useState<PilotBadge[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
    const router = useRouter();

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flag,timezones');
                const data = await res.json();
                const formattedCountries = data
                    .map((c: any) => ({
                        code: c.cca2,
                        name: c.name.common,
                        flag: c.flag,
                        timezones: c.timezones || []
                    }))
                    .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
                setCountries(formattedCountries);
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            }
        };
        fetchCountries();
    }, []);

    useEffect(() => {
        fetchPilotData();
    }, []);

    const fetchPilotData = useCallback(async () => {
        try {
            const sessionRes = await fetch('/api/auth/me');
            const sessionData = await sessionRes.json();
            
            if (!sessionData.user?.pilotId) {
                setLoading(false);
                return;
            }

            const [pilotRes, flightsRes, badgesRes] = await Promise.all([
                fetch(`/api/pilots?id=${sessionData.user.pilotId}`),
                fetch(`/api/portal/reports/recent?pilotId=${sessionData.user.id}`),
                fetch('/api/awards/my'),
            ]);

            const [data, flightsData, badgesData] = await Promise.all([
                pilotRes.json(),
                flightsRes.json(),
                badgesRes.json(),
            ]);

            if (data.pilot) {
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
                const pilotWithAvatar = {
                    ...data.pilot,
                    avatar_url: `https://res.cloudinary.com/${cloudName}/image/upload/avatars/pilot_${data.pilot.pilot_id}`
                };
                setPilot(pilotWithAvatar);
                
                const isDeleted = localStorage.getItem(`avatar_deleted_${data.pilot.pilot_id}`);
                if (isDeleted === 'true') {
                    setAvatarError(true);
                } else {
                    const cachedVersion = localStorage.getItem(`avatar_version_${data.pilot.pilot_id}`);
                    if (cachedVersion) {
                        setAvatarTimestamp(parseInt(cachedVersion, 10));
                    }
                }
            }

            if (flightsData.flights) setFlightHistory(flightsData.flights);
            if (Array.isArray(badgesData)) setPilotBadges(badgesData);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file.');
            return;
        }

        setUploadingImage(true);
        const toastId = toast.loading('Uploading profile picture...');

        try {
            await fetch('/api/cloudinary/delete', { method: 'DELETE' });
            
            const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
            const signData = await signRes.json();
            if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload signature');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', signData.apiKey);
            formData.append('timestamp', signData.timestamp.toString());
            formData.append('signature', signData.signature);
            formData.append('folder', signData.folder);
            formData.append('public_id', signData.publicId);
            formData.append('overwrite', 'true');
            formData.append('invalidate', 'true');

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            const cloudData = await cloudRes.json();
            if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Cloudinary upload failed');

            const newVersion = cloudData.version || Date.now();
            localStorage.setItem(`avatar_version_${pilot?.pilot_id}`, newVersion.toString());
            localStorage.removeItem(`avatar_deleted_${pilot?.pilot_id}`);
            setAvatarTimestamp(newVersion);
            setAvatarError(false);
            toast.success('Profile picture updated!', { id: toastId });
        } catch (error: any) {
            console.error('Image upload failed:', error);
            toast.error(error.message || 'Failed to update profile picture', { id: toastId });
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        const toastId = toast.loading('Removing profile picture...');

        try {
            const res = await fetch('/api/cloudinary/delete', {
                method: 'DELETE'
            });

            if (res.ok) {
                if (pilot?.pilot_id) {
                    localStorage.setItem(`avatar_deleted_${pilot.pilot_id}`, 'true');
                    localStorage.removeItem(`avatar_version_${pilot.pilot_id}`);
                }
                setAvatarError(true);
                setAvatarTimestamp(Date.now());
                toast.success('Profile picture removed!', { id: toastId });
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete from Cloudinary');
            }
        } catch (error: any) {
            console.error('Avatar removal failed:', error);
            toast.error(error.message || 'Failed to remove profile picture', { id: toastId });
        }
    };

    const getFlagUrl = (code: string) => `https://flagcdn.com/32x24/${code.toLowerCase()}.png`;
    const getCountryName = (code: string) => countries.find(c => c.code === code)?.name || code;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }
    
    if (!pilot) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <User className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-red-400">Pilot not found</p>
                </div>
            </div>
        );
    }

    const totalHours = pilot.total_hours + (pilot.transfer_hours || 0);
    const { currentRank, nextRank, progress } = getRankProgress(totalHours);
    const landingQuality = pilot.average_landing === 0 ? 'neutral' : 
                          Math.abs(pilot.average_landing) < 100 ? 'butter' : 
                          Math.abs(pilot.average_landing) < 200 ? 'good' : 'hard';

    const avatarUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""}/image/upload/c_fill,w_200,h_200,f_auto,q_auto/v${avatarTimestamp}/avatars/pilot_${pilot.pilot_id}`;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            {/* Header Card with Avatar */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] rounded-2xl border border-white/[0.04] p-6"
            >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Avatar */}
                    <div className="relative group flex-shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-1">
                            <div className="w-full h-full rounded-xl bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-2 border-amber-500/30">
                                {!avatarError ? (
                                    <img 
                                        key={avatarTimestamp}
                                        src={avatarUrl} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-amber-500/60">
                                        {pilot.first_name[0]}{pilot.last_name[0]}
                                    </span>
                                )}
                            </div>
                            
                            {/* Upload Overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingImage ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <label className="cursor-pointer hover:scale-110 transition-transform">
                                            <Camera className="w-6 h-6 text-white" />
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={handleImageUpload} 
                                                disabled={uploadingImage}
                                            />
                                        </label>
                                        {pilot.avatar_url && (
                                            <button 
                                                onClick={handleRemoveAvatar}
                                                className="hover:scale-110 transition-transform text-red-400"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#1a1a1a] ${
                            pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'
                        }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">
                                    {pilot.first_name} {pilot.last_name}
                                </h1>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-amber-500 font-mono font-bold">{pilot.pilot_id}</span>
                                    <span className={`flex items-center gap-1 ${pilot.status === 'Active' ? 'text-emerald-400' : 'text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${pilot.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                        {pilot.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Joined {new Date(pilot.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </div>
                            {pilot.country && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <img src={getFlagUrl(pilot.country)} alt="" className="w-4 h-3 rounded" />
                                    <span>{getCountryName(pilot.country)}</span>
                                </div>
                            )}
                        </div>

                        {/* Rank Progress */}
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/[0.04]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-semibold text-white">{currentRank.name}</span>
                                </div>
                                <span className="text-xs text-gray-500">Next: {nextRank.name}</span>
                            </div>
                            <div className="relative h-2 bg-black/50 rounded-full overflow-hidden mb-1">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>{totalHours.toFixed(1)}h</span>
                                <span>{nextRank.hours}h</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Flight Time', value: `${Math.floor(totalHours)}h`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Avg Landing', value: `${Math.abs(pilot.average_landing)} fpm`, icon: TrendingDown, color: landingQuality === 'butter' ? 'text-emerald-400' : 'text-amber-400', bg: landingQuality === 'butter' ? 'bg-emerald-500/10' : 'bg-amber-500/10' },
                    { label: 'Credits', value: pilot.balance >= 1000 ? `${(pilot.balance / 1000).toFixed(1)}K` : pilot.balance.toString(), icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10' },
                    { label: 'Total Flights', value: pilot.total_flights.toString(), icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-4 hover:border-white/[0.08] transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{stat.label}</span>
                            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Pilot Details & Badges */}
                <div className="space-y-6">
                    {/* Pilot Details */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                            <User className="w-4 h-4 text-amber-500" />
                            <h2 className="text-sm font-semibold text-white">Pilot Details</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {[
                                { label: 'Origin', value: pilot.country ? (
                                    <span className="flex items-center gap-2">
                                        <img src={getFlagUrl(pilot.country)} alt="" className="w-4 h-3 rounded" />
                                        {getCountryName(pilot.country)}
                                    </span>
                                ) : 'Not set' },
                                { label: 'VATSIM CID', value: pilot.vatsim_cid || 'Not Provided', link: pilot.vatsim_cid ? `https://stats.vatsim.net/search_id.php?id=${pilot.vatsim_cid}` : null },
                                { label: 'IVAO VID', value: pilot.ivao_vid || 'Not Provided', link: pilot.ivao_vid ? `https://www.ivao.aero/Member.aspx?Id=${pilot.ivao_vid}` : null },
                                { label: 'Routes Flown', value: (pilot.routes_flown?.length || 0).toString() },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">{item.label}</span>
                                    {item.link ? (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                                            {item.value}
                                        </a>
                                    ) : (
                                        <span className="text-white">{item.value}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Badges */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <h2 className="text-sm font-semibold text-white">Badges</h2>
                            <span className="ml-auto text-xs text-gray-500">{pilotBadges.length}</span>
                        </div>
                        <div className="p-4">
                            {pilotBadges.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {pilotBadges.map((badge) => (
                                        <div 
                                            key={badge._id} 
                                            className="bg-black/30 rounded-lg p-2 flex flex-col items-center border border-white/[0.04] hover:border-amber-500/30 transition-all cursor-pointer group"
                                        >
                                            {badge.award_id?.imageUrl ? (
                                                <img 
                                                    src={`/img/badge/${badge.award_id.imageUrl}`}
                                                    alt={badge.award_id?.name || 'Badge'}
                                                    className="w-10 h-10 object-contain mb-1 group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-1">
                                                    <Medal className="w-5 h-5 text-amber-500" />
                                                </div>
                                            )}
                                            <span className="text-[9px] text-gray-400 text-center truncate w-full">
                                                {badge.award_id?.name || 'Badge'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs">No badges yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Recent Flights */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-[#0a0a0a] border border-white/[0.04] rounded-xl overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <h2 className="text-sm font-semibold text-white">Recent Flights</h2>
                        <span className="ml-auto text-xs text-gray-500">{flightHistory.length} flights</span>
                    </div>
                    
                    <div className="divide-y divide-white/[0.04]">
                        {flightHistory.length > 0 ? (
                            flightHistory.slice(0, 10).map((flight, i) => (
                                <motion.div
                                    key={flight._id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.05 }}
                                    className="p-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                                <Plane className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-mono font-semibold text-amber-500">{flight.departure_icao}</span>
                                                    <ChevronRight className="w-3 h-3 text-gray-600" />
                                                    <span className="text-sm font-mono font-semibold text-amber-500">{flight.arrival_icao}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {flight.aircraft_type || '-'} • {flight.flight_time ? `${Math.floor(flight.flight_time / 60)}:${String(flight.flight_time % 60).padStart(2, '0')}` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                            flight.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            flight.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {flight.status === 'Accepted' && <Check className="w-3 h-3 inline mr-1" />}
                                            {flight.status === 'Rejected' && <X className="w-3 h-3 inline mr-1" />}
                                            {flight.status}
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <Plane className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">No flights recorded yet</p>
                                <p className="text-gray-600 text-xs mt-1">Complete your first flight to see it here</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
