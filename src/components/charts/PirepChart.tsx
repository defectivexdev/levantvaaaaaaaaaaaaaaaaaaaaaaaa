'use client';

import { 
    ComposedChart, 
    Line, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface TelemetryPoint {
    time: number; // relative time in ms or seconds
    alt: number; // altitude in ft
    gs: number; // ground speed in knots
    vs: number; // vertical speed in fpm
}

interface PirepChartProps {
    data: TelemetryPoint[];
}

export default function PirepChart({ data }: PirepChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-white/5 rounded-xl border border-white/[0.08]">
                <p className="text-gray-500 text-sm">No telemetry data available for this flight.</p>
            </div>
        );
    }

    // Downsample data if too large for performance
    const chartData = data.length > 500 
        ? data.filter((_, i) => i % Math.ceil(data.length / 500) === 0) 
        : data;

    return (
        <div className="w-full h-[400px] bg-black/20 rounded-xl p-4 border border-white/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    
                    {/* Time Axis */}
                    <XAxis 
                        dataKey="time" 
                        stroke="#666" 
                        tickFormatter={(val) => {
                            const mins = Math.floor(val / 60000); // assuming ms
                            return `${mins}m`;
                        }}
                        minTickGap={50}
                        tick={{ fontSize: 10 }}
                    />

                    {/* Left Axis: Altitude (ft) & VS (fpm) */}
                    <YAxis 
                        yAxisId="left" 
                        stroke="#888" 
                        orientation="left"
                        tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
                        tick={{ fontSize: 10 }}
                    />

                    {/* Right Axis: Speed (kts) */}
                    <YAxis 
                        yAxisId="right" 
                        stroke="#eab308" 
                        orientation="right" 
                        unit=" kts"
                        tick={{ fontSize: 10 }}
                    />

                    <Tooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelStyle={{ color: '#888', marginBottom: '5px' }}
                        labelFormatter={(val) => `Time: ${Math.floor(val / 60000)}m`}
                    />

                    {/* Vertical Speed (Background Gradient Area) */}
                    <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="vs" 
                        name="Vertical Speed" 
                        fill="#3b82f6" 
                        fillOpacity={0.1} 
                        stroke="#3b82f6" 
                        strokeWidth={1}
                        dot={false}
                    />

                    {/* Altitude Line */}
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="alt" 
                        name="Altitude" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />

                    {/* Speed Line */}
                    <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="gs" 
                        name="Ground Speed" 
                        stroke="#eab308" 
                        strokeWidth={2} 
                        dot={false}
                    />

                    <ReferenceLine y={0} yAxisId="left" stroke="#333" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
