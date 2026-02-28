'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend
} from 'recharts';

interface TelemetryPoint {
    time: number;
    alt: number;
    gs: number;
    vs?: number;
    comfort?: number;
}

interface Props {
    data: TelemetryPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/[0.08] p-4 rounded-xl shadow-2xl ring-1 ring-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 pb-2 border-b border-white/[0.06]">
                    T + {new Date(label).toLocaleTimeString([], { hour12: false })}
                </p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-8 mb-2 last:mb-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{entry.name}</span>
                        </div>
                        <span className="text-white font-mono text-xs font-black">
                            {entry.value.toLocaleString()} <span className="text-[10px] text-gray-500 uppercase">{entry.unit}</span>
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function FlightAnalysisChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="glass-card p-12 text-center text-gray-500 italic border-dashed">
                No telemetry telemetry data stream available for this operational record.
            </div>
        );
    }

    // Process data for charts
    const chartData = data.map(p => ({
        ...p,
        timestamp: p.time,
        altitude: Math.round(p.alt),
        speed: Math.round(p.gs),
        vs: Math.round(p.vs || 0),
        comfort: p.comfort || 100
    }));

    // Summary stats
    const maxAlt = Math.max(...chartData.map(d => d.altitude));
    const maxSpeed = Math.max(...chartData.map(d => d.speed));
    const avgSpeed = Math.round(chartData.reduce((a, d) => a + d.speed, 0) / chartData.length);
    const avgComfort = Math.round(chartData.reduce((a, d) => a + d.comfort, 0) / chartData.length * 10) / 10;

    return (
        <div className="space-y-6">
            <div className="glass-card p-8 border border-white/[0.06] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold/40" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            Flight Profile Telemetry
                            <span className="text-[10px] bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded border border-accent-gold/20 font-mono">30S_BUFFER</span>
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Full Mission Reconstruction</p>
                    </div>
                    
                    <div className="flex gap-6">
                        <ChartLegend color="#d4af37" label="Alt (FT)" />
                        <ChartLegend color="#34d399" label="Speed (KTS)" />
                        <ChartLegend color="#fb7185" label="V/S (FPM)" />
                    </div>
                </div>

                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorGs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorVs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                                dataKey="timestamp"
                                stroke="#ffffff15"
                                fontSize={9}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={60}
                            />
                            <YAxis 
                                yAxisId="left"
                                stroke="#ffffff20" 
                                fontSize={10}
                                tickFormatter={(val) => `${val}ft`}
                                width={60}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#ffffff20" 
                                fontSize={10}
                                tickFormatter={(val) => `${val}kts`}
                                width={60}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="altitude" 
                                name="Altitude" 
                                unit="ft"
                                stroke="#d4af37" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorAlt)"
                                activeDot={{ r: 5, stroke: '#d4af37', strokeWidth: 2, fill: '#000' }}
                            />
                            <Area 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="speed" 
                                name="Ground Speed" 
                                unit="kts"
                                stroke="#34d399" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={1} 
                                fill="url(#colorGs)"
                                activeDot={{ r: 5, stroke: '#34d399', strokeWidth: 2, fill: '#000' }}
                            />
                            <Area 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="vs" 
                                name="Vertical Speed" 
                                unit="fpm"
                                stroke="#fb7185" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorVs)"
                                activeDot={{ r: 5, stroke: '#fb7185', strokeWidth: 2, fill: '#000' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Passenger Comfort Score Timeline */}
            <div className="glass-card p-8 border border-white/[0.06] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-400/40" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-display font-black text-white uppercase tracking-tighter">Passenger Experience</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Comfort & Stability Analysis</p>
                    </div>
                </div>

                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis 
                                domain={[0, 100]} 
                                stroke="#ffffff20" 
                                fontSize={10}
                                tickFormatter={(val) => `${val}%`}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                                type="monotone" 
                                dataKey="comfort" 
                                name="Comfort Score" 
                                unit="%"
                                stroke="#60a5fa" 
                                strokeWidth={3} 
                                dot={false}
                                activeDot={{ r: 6, stroke: '#60a5fa', strokeWidth: 2, fill: '#000' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 flex items-center justify-center gap-8 py-4 bg-black/20 rounded-xl border border-white/[0.06]">
                    <ComfortStat label="Avg. Comfort" value={`${avgComfort}%`} />
                    <div className="w-[1px] h-8 bg-white/5" />
                    <ComfortStat label="Max Altitude" value={`${maxAlt.toLocaleString()} ft`} />
                    <div className="w-[1px] h-8 bg-white/5" />
                    <ComfortStat label="Max GS" value={`${maxSpeed} kts`} />
                    <div className="w-[1px] h-8 bg-white/5" />
                    <ComfortStat label="Avg GS" value={`${avgSpeed} kts`} />
                </div>
            </div>
        </div>
    );
}

function ChartLegend({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{label}</span>
        </div>
    );
}

function ComfortStat({ label, value }: { label: string, value: string }) {
    return (
        <div className="text-center">
            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">{label}</p>
            <p className="text-xs font-mono font-black text-white">{value}</p>
        </div>
    );
}
