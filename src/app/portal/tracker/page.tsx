'use client';

import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { Download, Shield, Zap, Globe } from 'lucide-react';

export default function TrackerPage() {
    return (
        <div className="space-y-6">
            {/* Premium Showcase */}
            <div className="w-full overflow-hidden bg-white dark:bg-[#0B0B0F] rounded-3xl border border-white/[0.08] shadow-2xl">
                <MacbookScroll
                    title={
                        <span className="text-4xl md:text-6xl font-display font-black tracking-tighter">
                            Levant ACARS v2.0 <br /> 
                            <span className="text-accent-gold">Automated. Precise. Elite.</span>
                        </span>
                    }
                    badge={
                        <div className="h-12 w-12 rounded-full bg-accent-gold flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                            <span className="text-xl">🚀</span>
                        </div>
                    }
                    src={`/img/acars_preview.png`} // Assuming this might exist or user will add
                    showGradient={false}
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center flex flex-col items-center group hover:border-blue-500/20 transition-all">
                    <div className="w-14 h-14 mb-5 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/20 transition-all border border-blue-500/20">
                        <Download className="text-blue-400 w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Windows v1.0.0</h2>
                    <p className="text-gray-500 text-xs mb-5">Full P3D, X-Plane, and MSFS support.</p>
                    <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                        Download for Windows
                    </button>
                </div>

                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center flex flex-col items-center group">
                    <div className="w-14 h-14 mb-5 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                        <Zap className="text-emerald-400 w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Fast Installation</h2>
                    <p className="text-gray-500 text-xs mb-5">Zero-config setup. Just login and fly your scheduled routes.</p>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold border border-white/[0.08] uppercase tabular-nums tracking-widest leading-none flex items-center">
                            32 MB
                        </span>
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold border border-white/[0.08] uppercase tabular-nums tracking-widest leading-none flex items-center">
                            Zip Archive
                        </span>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 text-center flex flex-col items-center group">
                    <div className="w-14 h-14 mb-5 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:bg-purple-500/20 transition-all border border-purple-500/20">
                        <Shield className="text-purple-400 w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Secure & Verified</h2>
                    <p className="text-gray-500 text-xs mb-5">Digitally signed binaries ensuring your system safety.</p>
                    <button className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/[0.06]">
                        Release Notes
                    </button>
                </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Globe className="text-accent-gold w-4 h-4" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Advanced Features</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureItem title="Real-time Tracking" desc="Sub-second synchronization with our Global Radar." />
                    <FeatureItem title="Landing Analysis" desc="Detailed touch-down stats for every flight logged." />
                    <FeatureItem title="SimBrief Sync" desc="Import your OFP and flight plan with one click." />
                    <FeatureItem title="Smart Log" desc="Event-based logging for fuel, speed, and phases." />
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div>
            <h3 className="text-white font-bold mb-1 text-sm">{title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        </div>
    )
}
