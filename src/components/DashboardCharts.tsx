'use client';

import { useEffect, useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Plane, Fuel, Target } from 'lucide-react';

interface ChartData {
    flightHours: { month: string; hours: number; flights: number }[];
    landingRates: { flight: string; rate: number }[];
    landingDistribution: { range: string; count: number; color: string }[];
    fuelEfficiency: { flight: string; fuelPerHour: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
};

export default function DashboardCharts() {
    const [data, setData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/portal/stats/charts')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[#0a0a0a]/50 border border-white/[0.06] rounded-xl h-64 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!data) return null;

    const avgLanding = data.landingRates.length > 0
        ? Math.round(data.landingRates.reduce((s, r) => s + r.rate, 0) / data.landingRates.length)
        : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Flight Hours Per Month */}
            <div className="bg-[#0a0a0a]/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent-gold" />
                    <h3 className="text-sm font-semibold text-white">Flight Hours (12 months)</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.flightHours}>
                        <defs>
                            <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="hours" name="Hours" stroke="#d4af37" fill="url(#hoursGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Landing Rate Trend */}
            <div className="bg-[#0a0a0a]/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-semibold text-white">Landing Rate Trend</h3>
                    </div>
                    <span className="text-xs text-gray-500">Avg: <span className="text-white font-medium">{avgLanding} fpm</span></span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.landingRates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="flight" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} reversed />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="rate" name="Rate (fpm)" stroke="#22c55e" strokeWidth={2} dot={{ r: 2, fill: '#22c55e' }} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Landing Distribution */}
            <div className="bg-[#0a0a0a]/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Landing Distribution (last 50)</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.landingDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={25} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Flights" radius={[4, 4, 0, 0]}>
                            {data.landingDistribution.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Fuel Efficiency */}
            <div className="bg-[#0a0a0a]/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Fuel className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-semibold text-white">Fuel Efficiency (lbs/hr)</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.fuelEfficiency}>
                        <defs>
                            <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="flight" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="fuelPerHour" name="lbs/hr" fill="url(#fuelGrad)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
