'use client';
import { useState, useEffect } from 'react';
import { Plane, AlertTriangle, PenTool, CheckCircle, MapPin } from 'lucide-react';

export default function HangarPage() {
    const [fleet, setFleet] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking Fleet Data for Now (Until we have an API endpoint or DB seeding)
        // In real impl, fetch from /api/portal/fleet
        const mockFleet = [
            { registration: 'OD-LVT', type: 'A320', location: 'OJAI', condition: 98, status: 'Available', hours: 450 },
            { registration: 'OD-ZEU', type: 'A320', location: 'OSDI', condition: 100, status: 'Available', hours: 12 },
            { registration: 'OD-HER', type: 'A321', location: 'ORBI', condition: 85, status: 'InFlight', hours: 1200 },
            { registration: 'OD-POS', type: 'B738', location: 'OMDB', condition: 38, status: 'Maintenance', hours: 3400 },
        ];
        
        setTimeout(() => {
            setFleet(mockFleet);
            setLoading(false);
        }, 1000);
    }, []);

    const getConditionColor = (cond: number) => {
        if (cond > 90) return 'text-emerald-400';
        if (cond > 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-6">
             <div className="flex items-end justify-between">
                <div>
                     <h1 className="text-2xl font-bold text-white">Fleet Hangar</h1>
                     <p className="text-gray-500 text-xs mt-0.5">Manage airframe health and maintenance</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-4 py-2">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Fleet</span>
                    <span className="text-lg font-bold text-white font-mono">{fleet.length}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {fleet.map((plane) => (
                     <div key={plane.registration} className={`bg-[#0a0a0a] border rounded-2xl p-5 relative overflow-hidden group ${plane.status === 'Maintenance' ? 'border-red-500/20' : 'border-white/[0.06]'}`}>
                         {plane.status === 'Maintenance' && (
                             <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg animate-pulse">
                                 MAINTENANCE REQUIRED
                             </div>
                         )}

                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <div className="text-2xl font-bold text-white font-mono">{plane.registration}</div>
                                 <div className="text-sm text-gray-500 font-bold">{plane.type}</div>
                             </div>
                             <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                                 <Plane className="text-gray-400" />
                             </div>
                         </div>

                         <div className="space-y-4">
                             {/* Condition Bar */}
                             <div>
                                 <div className="flex justify-between text-xs mb-1">
                                     <span className="text-gray-500">Hull Condition</span>
                                     <span className={`font-bold ${getConditionColor(plane.condition)}`}>{plane.condition}%</span>
                                 </div>
                                 <div className="h-2 bg-[#080808] rounded-full overflow-hidden">
                                     <div 
                                         className={`h-full rounded-full transition-all duration-1000 ${plane.condition > 90 ? 'bg-emerald-500' : plane.condition > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                         style={{ width: `${plane.condition}%` }}
                                    />
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4 text-sm">
                                 <div className="bg-white/5 p-3 rounded-lg">
                                     <div className="text-gray-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={10} /> Location</div>
                                     <div className="text-white font-mono">{plane.location}</div>
                                 </div>
                                 <div className="bg-white/5 p-3 rounded-lg">
                                     <div className="text-gray-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><PenTool size={10} /> Hours</div>
                                     <div className="text-white font-mono">{plane.hours}h</div>
                                 </div>
                             </div>
                             
                             {plane.status === 'Maintenance' ? (
                                 <button className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                                     <AlertTriangle size={16} /> Order Repairs
                                 </button>
                             ) : (
                                 <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold justify-center py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                     <CheckCircle size={14} /> FLIGHT READY
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
}
