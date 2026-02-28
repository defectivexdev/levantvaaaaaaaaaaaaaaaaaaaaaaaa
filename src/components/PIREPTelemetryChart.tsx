'use client';

import { useMemo } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid,
    LineChart,
    Line,
    ComposedChart,
    Bar
} from 'recharts';
import { TrendingUp, Gauge, ArrowDown } from 'lucide-react';

interface TelemetryPoint {
    time: number;
    alt: number;
    gs: number;
    vs: number;
}

interface PIREPTelemetryChartProps {
    telemetry: TelemetryPoint[];
    landingRate?: number;
    flightTime?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 shadow-xl">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                    {label}
                </p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-400">{entry.name}:</span>
                        <span className="text-white font-mono font-medium">
                            {entry.value.toLocaleString()}
                            <span className="text-gray-500 text-xs ml-1">
                                {entry.name === 'Altitude' ? 'ft' : 
                                 entry.name === 'Speed' ? 'kts' : 'fpm'}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function PIREPTelemetryChart({ 
    telemetry, 
    landingRate,
    flightTime 
}: PIREPTelemetryChartProps) {
    // Format telemetry data for charts
    const chartData = useMemo(() => {
        if (!telemetry || telemetry.length === 0) return [];
        
        const startTime = telemetry[0]?.time || 0;
        
        return telemetry.map((point, index) => {
            const elapsedMinutes = Math.round((point.time - startTime) / 60000);
            const hours = Math.floor(elapsedMinutes / 60);
            const mins = elapsedMinutes % 60;
            
            return {
                time: hours > 0 ? `${hours}h${mins}m` : `${mins}m`,
                rawTime: elapsedMinutes,
                altitude: point.alt,
                speed: point.gs,
                vs: point.vs,
                index
            };
        });
    }, [telemetry]);

    // Calculate flight stats
    const stats = useMemo(() => {
        if (!chartData.length) return null;
        
        const maxAlt = Math.max(...chartData.map(d => d.altitude));
        const avgSpeed = Math.round(chartData.reduce((acc, d) => acc + d.speed, 0) / chartData.length);
        const maxSpeed = Math.max(...chartData.map(d => d.speed));
        
        return { maxAlt, avgSpeed, maxSpeed };
    }, [chartData]);

    if (!telemetry || telemetry.length < 2) {
        return (
            <div className="bg-[#141414] rounded-xl border border-gray-800/50 p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No telemetry data available</p>
                <p className="text-gray-600 text-xs mt-1">Flight data is recorded during ACARS flights</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Max Altitude', value: `${stats?.maxAlt.toLocaleString()} ft`, icon: TrendingUp, color: 'text-blue-400' },
                    { label: 'Avg Speed', value: `${stats?.avgSpeed} kts`, icon: Gauge, color: 'text-emerald-400' },
                    { label: 'Max Speed', value: `${stats?.maxSpeed} kts`, icon: Gauge, color: 'text-amber-400' },
                    { label: 'Landing Rate', value: `${Math.abs(landingRate || 0)} fpm`, icon: ArrowDown, 
                      color: Math.abs(landingRate || 0) < 100 ? 'text-emerald-400' : 
                             Math.abs(landingRate || 0) < 200 ? 'text-amber-400' : 'text-red-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#0f0f0f] rounded-xl p-4 border border-gray-800/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-widest text-gray-500">{stat.label}</span>
                            <stat.icon className={`w-4 h-4 ${stat.color} opacity-50`} />
                        </div>
                        <span className="text-lg font-bold text-white font-mono">{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Altitude Profile */}
            <div className="bg-[#141414] rounded-xl border border-gray-800/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-white uppercase tracking-wider">Altitude Profile</h3>
                </div>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                            <XAxis 
                                dataKey="time" 
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                axisLine={{ stroke: '#374151' }}
                                tickLine={{ stroke: '#374151' }}
                            />
                            <YAxis 
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                axisLine={{ stroke: '#374151' }}
                                tickLine={{ stroke: '#374151' }}
                                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="altitude" 
                                name="Altitude"
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fill="url(#altGradient)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Speed & Vertical Speed */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Ground Speed */}
                <div className="bg-[#141414] rounded-xl border border-gray-800/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-medium text-white uppercase tracking-wider">Ground Speed</h3>
                    </div>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    axisLine={{ stroke: '#374151' }}
                                    tickLine={{ stroke: '#374151' }}
                                />
                                <YAxis 
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    axisLine={{ stroke: '#374151' }}
                                    tickLine={{ stroke: '#374151' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                    type="monotone" 
                                    dataKey="speed" 
                                    name="Speed"
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vertical Speed */}
                <div className="bg-[#141414] rounded-xl border border-gray-800/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowDown className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-medium text-white uppercase tracking-wider">Vertical Speed</h3>
                    </div>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="vsGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    axisLine={{ stroke: '#374151' }}
                                    tickLine={{ stroke: '#374151' }}
                                />
                                <YAxis 
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    axisLine={{ stroke: '#374151' }}
                                    tickLine={{ stroke: '#374151' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="vs" 
                                    name="V/S"
                                    stroke="#f59e0b" 
                                    strokeWidth={2}
                                    fill="url(#vsGradient)"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
