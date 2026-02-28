'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MapPin, ArrowDown, Activity, AlertTriangle, Play, Pause, RotateCcw, TrendingUp } from 'lucide-react';

export default function LandingAnalysis({ rpt }: { rpt: any }) {
    if (!rpt) return null;

    const { samples, butterScore, touchdownIndex, gForceTouchdown } = rpt;
    
    // Slice data to show strictly 10s before touchdown to 5s after (or end)
    const tdIdx = touchdownIndex || samples.length - 1;
    const startIdx = Math.max(0, tdIdx - 50); // 50 samples * 200ms = 10s
    const endIdx = Math.min(samples.length, tdIdx + 25);
    const chartSamples = samples.slice(startIdx, endIdx);

    // Cinematic Replay State
    const [currentIndex, setCurrentIndex] = useState(tdIdx - startIdx); // Default to touchdown point
    const currentSample = chartSamples[currentIndex] || samples[tdIdx];

    const data = chartSamples.map((s: any, i: number) => ({
        index: i,
        time: ((i - (tdIdx - startIdx)) * 0.2).toFixed(1), // Normalized time (0 = touchdown)
        alt: s.alt,
        vs: s.vs,
        pitch: s.pitch,
        g: s.gForce
    }));

    const getScoreColor = (score: number) => {
        if (score >= 9.0) return 'text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]';
        if (score >= 8.0) return 'text-emerald-400';
        if (score >= 6.0) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 9.5) return 'BUTTER';
        if (score >= 9.0) return 'EXCELLENT';
        if (score >= 8.0) return 'GREAT';
        if (score >= 6.0) return 'ACCEPTABLE';
        if (score >= 4.0) return 'FIRM';
        return 'RYANAIR';
    };

    return (
        <div className="w-full space-y-6">
            {/* HERDER & METRICS */}
            <div className="glass-card rounded-2xl p-8 flex flex-col xl:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-48 bg-accent-gold/5 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="text-center xl:text-left z-10">
                     <h3 className="text-gray-500 font-mono text-xs tracking-widest uppercase mb-1">Performance Analysis</h3>
                     <h1 className={`text-7xl font-display font-bold ${getScoreColor(butterScore)}`}>{butterScore.toFixed(1)}</h1>
                     <div className={`text-xl font-bold tracking-widest mt-2 ${getScoreColor(butterScore)}`}>{getScoreLabel(butterScore)}</div>
                </div>

                {/* Real-time Cinematic Gauges */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 z-10 flex-1 justify-center">
                    <StatBox 
                        label="G-Force" 
                        value={`${currentSample.gForce?.toFixed(2)}G`} 
                        icon={<Activity size={16}/>} 
                        isTouchdown={currentIndex === (tdIdx - startIdx)}
                    />
                    <StatBox 
                        label="Vertical Speed" 
                        value={`${Math.round(currentSample.vs || 0)} fpm`} 
                        icon={<ArrowDown size={16}/>} 
                        isTouchdown={currentIndex === (tdIdx - startIdx)}
                    />
                    <StatBox 
                        label="Pitch Angle" 
                        value={`${(currentSample.pitch || 0).toFixed(1)}°`} 
                        icon={<Activity size={16} className="rotate-90"/>} 
                        isTouchdown={currentIndex === (tdIdx - startIdx)}
                    />
                    <StatBox 
                        label="Radio Altitude" 
                        value={`${Math.round(currentSample.alt || 0)} ft`} 
                        icon={<TrendingUp size={16}/>} 
                        isTouchdown={currentIndex === (tdIdx - startIdx)}
                    />
                </div>
            </div>

            {/* CINEMATIC REPLAY CONTROLS */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-dark-900 to-dark-800">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setCurrentIndex(0)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" title="Restart"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span>Final Approach</span>
                            <span className="text-accent-gold font-mono">
                                T{data[currentIndex].time >= 0 ? '+' : ''}{data[currentIndex].time}s {currentIndex === (tdIdx - startIdx) && '(TOUCHDOWN)'}
                            </span>
                            <span>Landing Roll</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max={data.length - 1} 
                            value={currentIndex}
                            onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-gold hover:accent-accent-gold/80 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* GRAPHS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/[0.06] relative group">
                    <h4 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-400" /> Vertical Profile
                    </h4>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis dataKey="time" stroke="#444" tick={{fontSize: 10}} hide />
                                <YAxis yAxisId="left" stroke="#10b981" tick={{fontSize: 10}} width={40} />
                                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{fontSize: 10}} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine x={data[currentIndex].time} stroke="#eab308" strokeDasharray="3 3" />
                                <ReferenceLine x="0.0" stroke="#ffffff" strokeOpacity={0.2} label={{ value: 'TD', position: 'top', fill: '#666', fontSize: 10 }} />
                                <Line yAxisId="left" type="monotone" dataKey="alt" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={0} />
                                <Line yAxisId="right" type="monotone" dataKey="vs" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={0} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/[0.06]">
                    <h4 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest flex items-center gap-2">
                         <Activity size={14} className="text-purple-400" /> Stability Profile
                    </h4>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis dataKey="time" stroke="#444" tick={{fontSize: 10}} hide />
                                <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#f59e0b" tick={{fontSize: 10}} width={40} />
                                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="#8b5cf6" tick={{fontSize: 10}} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine x={data[currentIndex].time} stroke="#eab308" strokeDasharray="3 3" />
                                <ReferenceLine x="0.0" stroke="#ffffff" strokeOpacity={0.2} />
                                <Line yAxisId="left" type="monotone" dataKey="g" stroke="#f59e0b" strokeWidth={2} dot={false} animationDuration={0} />
                                <Line yAxisId="right" type="monotone" dataKey="pitch" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={0} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon, isTouchdown }: any) {
    return (
        <div className={`text-center transition-all duration-300 ${isTouchdown ? 'scale-110' : 'opacity-80'}`}>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center justify-center gap-2">
                {icon} {label}
            </div>
            <div className={`text-2xl font-bold font-mono ${isTouchdown ? 'text-accent-gold' : 'text-white'}`}>
                {value}
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#080808]/90 border border-white/[0.08] p-3 rounded-lg backdrop-blur-md shadow-2xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">T{payload[0].payload.time}s</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                        <span className="text-xs text-gray-300">{p.name === 'alt' ? 'Altitude' : p.name === 'vs' ? 'VS' : p.name === 'g' ? 'G-Force' : 'Pitch'}</span>
                        <span className="text-xs font-mono font-bold" style={{color: p.color}}>{p.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}
