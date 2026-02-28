'use client';

import { useState, useEffect } from 'react';
import { Plane, MapPin, CreditCard, CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Airport {
    icao: string;
    airport: string;
    iata?: string;
    country_code?: string;
}

export default function JumpseatsPage() {
    const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Airport[]>([]);
    const [searching, setSearching] = useState(false);
    
    const [currentLocation, setCurrentLocation] = useState('...');
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const TICKET_COST = 1000;

    const fetchPilotData = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                const pilotRes = await fetch(`/api/pilots?pilotId=${data.user.pilotId}`);
                const pilotData = await pilotRes.json();
                if (pilotData.pilot) {
                    setCurrentLocation(pilotData.pilot.current_location || 'OJAI');
                    setCredits(pilotData.pilot.balance || 0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch pilot data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPilotData();
    }, []);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/portal/airports?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setSearchResults(data.results || []);
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleJumpseat = async () => {
        if (!selectedAirport) return;
        
        if (credits < TICKET_COST) {
            setStatus({ type: 'error', message: 'Insufficient credits for this jumpseat.' });
            return;
        }

        setBooking(true);
        setStatus(null);

        try {
            const res = await fetch('/api/portal/jumpseat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destinationIcao: selectedAirport.icao }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', message: data.message });
                toast.success('Ticket Purchased!', { description: data.message });
                setCurrentLocation(data.newLocation);
                setCredits(data.remainingCredits);
                setSelectedAirport(null);
                setSearchQuery('');
                setSearchResults([]);
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to book jumpseat.' });
                toast.error('Booking Failed', { description: data.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection error. Please try again.' });
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Travel Center</h1>
                <p className="text-gray-500 text-xs mt-0.5">Jumpseat to any airport worldwide for {TICKET_COST.toLocaleString()} cr</p>
            </div>

            {loading ? (
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-accent-gold" />
                    <p className="text-gray-500 text-xs">Loading your status...</p>
                </div>
            ) : (
                <>
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Current Status */}
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 h-fit">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-accent-gold" />
                                Current Location
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-[#111]/50 rounded-lg border border-white/[0.06]">
                                    <span className="text-gray-400">Location</span>
                                    <span className="text-accent-gold font-mono text-2xl font-bold">{currentLocation}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-[#111]/50 rounded-lg border border-white/[0.06]">
                                    <span className="text-gray-400">Available Balance</span>
                                    <div className="text-right">
                                        <span className="text-emerald-400 font-bold text-2xl">{credits.toLocaleString()} cr</span>
                                    </div>
                                </div>
                            </div>

                            {status && (
                                <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 border ${
                                    status.type === 'success' 
                                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                    {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                    <p className="text-sm">{status.message}</p>
                                </div>
                            )}
                        </div>

                        {/* Search & Select */}
                        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                            <div>
                                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-accent-gold" />
                                    Search Destination
                                </h2>
                                <input 
                                    type="text" 
                                    placeholder="Search by ICAO, City, or Name..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#111]/50 border border-white/[0.08] rounded-lg p-3 text-white focus:outline-none focus:border-accent-gold transition-colors"
                                />
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {searching ? (
                                    <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((airport) => (
                                        <button
                                            key={airport.icao}
                                            onClick={() => setSelectedAirport(airport)}
                                            disabled={airport.icao === currentLocation}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                                selectedAirport?.icao === airport.icao
                                                    ? 'bg-accent-gold/20 border-accent-gold text-white'
                                                    : 'bg-[#111]/30 border-transparent hover:border-white/10 text-gray-300'
                                            } ${airport.icao === currentLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    <span className="font-mono text-accent-gold">{airport.icao}</span>
                                                    <span>{airport.airport}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">{airport.country_code}</div>
                                            </div>
                                            {airport.icao === currentLocation && <span className="text-xs uppercase bg-white/10 px-2 py-0.5 rounded">Current</span>}
                                        </button>
                                    ))
                                ) : searchQuery.length > 1 ? (
                                    <div className="text-center py-8 text-gray-500">No airports found</div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">Type at least 2 characters to search</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Booking Confirmation Bar */}
                    <div className={`bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 ${selectedAirport ? 'opacity-100 translate-y-0 border-accent-gold/20' : 'opacity-40 translate-y-4 pointer-events-none'}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <CreditCard className="w-8 h-8 text-accent-gold hidden md:block" />
                                <div>
                                    <p className="text-gray-400 text-sm">Review Booking</p>
                                    <div className="text-xl text-white">
                                        Travel to <span className="font-bold text-accent-gold">{selectedAirport?.airport} ({selectedAirport?.icao})</span>
                                    </div>
                                    <div className="text-sm text-gray-400">Cost: <span className="text-white font-bold">{TICKET_COST.toLocaleString()} cr</span></div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleJumpseat}
                                disabled={!selectedAirport || booking || credits < TICKET_COST}
                                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-accent-gold to-yellow-600 text-dark-900 rounded-lg font-bold hover:shadow-lg hover:shadow-accent-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Ticket'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
