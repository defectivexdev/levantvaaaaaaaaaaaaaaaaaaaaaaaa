'use client';

import { useState, useEffect } from 'react';
import { Download, ExternalLink, Shield, Radio, Monitor, Gauge, Tag, HardDrive, FileDown, CheckCircle, Cpu, Zap, BarChart3, ArrowDownToLine } from 'lucide-react';
import { motion } from 'framer-motion';

interface GitHubRelease {
    version: string;
    tag: string;
    name: string;
    body: string;
    published_at: string;
    html_url: string;
    msi: {
        name: string;
        size: string;
        download_url: string;
        download_count: number;
    } | null;
    zip: {
        name: string;
        size: string;
        download_url: string;
        download_count: number;
    } | null;
    total_downloads: number;
}

const FEATURES = [
    { icon: Zap, label: 'Auto PIREP', desc: 'Automatic flight report submission' },
    { icon: BarChart3, label: 'Landing Rate', desc: 'Precise touchdown analysis' },
    { icon: Cpu, label: 'Real-Time', desc: 'Live position tracking & map' },
    { icon: Shield, label: 'Secure', desc: 'Signed & verified builds' },
];

export default function DownloadsPage() {
    const [release, setRelease] = useState<GitHubRelease | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloaded, setDownloaded] = useState(false);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await fetch('/api/acars/github-release');
                if (res.ok) {
                    const data = await res.json();
                    setRelease(data.release);
                }
            } catch { /* silent */ }
            finally { setLoading(false); }
        };
        fetchLatest();
    }, []);

    const trackAndDownload = async (url: string, version: string) => {
        setDownloaded(true);
        try {
            await fetch('/api/track-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version, platform: 'Windows' })
            });
        } catch { /* tracking is best-effort */ }
        window.open(url, '_blank');
        setTimeout(() => setDownloaded(false), 5000);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-accent-gold" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Downloads</h1>
                    <p className="text-gray-500 text-xs">Essential tools for your flying career</p>
                </div>
            </div>

            {/* ACARS Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden"
            >
                {/* Decorative background */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent-gold/[0.03] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/[0.03] rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="relative p-8 md:p-10">
                    {/* Top badge */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-gold/10 border border-accent-gold/20 rounded-full">
                            <Gauge className="w-3.5 h-3.5 text-accent-gold" />
                            <span className="text-accent-gold text-[10px] font-bold uppercase tracking-widest">Official Software</span>
                        </div>
                        {release && (
                            <span className="px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-full text-gray-400 text-[10px] font-mono">
                                v{release.version}
                            </span>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Levant ACARS</h2>
                                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                                    The heart of your flight operations. Automatically records flight data, 
                                    monitors landing performance, and submits PIREPs to our system.
                                </p>
                            </div>

                            {/* Meta info */}
                            {release && (
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 font-mono">
                                    <span className="flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" />
                                        {new Date(release.published_at).toLocaleDateString()}
                                    </span>
                                    {release.msi && (
                                        <span className="flex items-center gap-1.5">
                                            <HardDrive className="w-3 h-3" />
                                            {release.msi.size}
                                        </span>
                                    )}
                                    {release.total_downloads > 0 && (
                                        <span className="flex items-center gap-1.5">
                                            <FileDown className="w-3 h-3" />
                                            {release.total_downloads.toLocaleString()} downloads
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Monitor className="w-3 h-3" />
                                        Windows 10+
                                    </span>
                                </div>
                            )}

                            {/* Download button */}
                            <div className="pt-2">
                                {loading ? (
                                    <div className="h-14 w-64 bg-white/5 border border-white/[0.08] rounded-xl animate-pulse flex items-center justify-center">
                                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Loading...</span>
                                    </div>
                                ) : release?.msi ? (
                                    <button 
                                        onClick={() => trackAndDownload(release.msi!.download_url, release.version)}
                                        className={`group relative flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all ${
                                            downloaded 
                                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                                : 'bg-accent-gold hover:bg-accent-gold/90 text-black shadow-lg shadow-accent-gold/20 hover:shadow-accent-gold/30 hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                    >
                                        {downloaded ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                <span>Download Started</span>
                                            </>
                                        ) : (
                                            <>
                                                <ArrowDownToLine className="w-5 h-5 group-hover:animate-bounce" />
                                                <div className="text-left">
                                                    <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono leading-none">Download for Windows</div>
                                                    <div className="text-lg leading-none mt-0.5">Version {release.version}</div>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm">
                                        No release available at this time.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Features grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {FEATURES.map((feat, i) => (
                                <motion.div
                                    key={feat.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.05 }}
                                    className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 group hover:border-white/10 transition-all"
                                >
                                    <feat.icon className="w-5 h-5 text-accent-gold mb-2 group-hover:scale-110 transition-transform" />
                                    <p className="text-white text-sm font-bold">{feat.label}</p>
                                    <p className="text-gray-500 text-[11px] mt-0.5">{feat.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Required Utilities */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Required Utilities</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { name: 'FSUIPC', desc: 'Required for MSFS / P3D / FSX', url: 'https://fsuipc.com/downloadspage/', icon: Monitor, color: 'blue' },
                        { name: 'XPUIPC', desc: 'Required for X-Plane Integration', url: 'https://www.schiratti.com/xpuipc.html', icon: Radio, color: 'green' },
                    ].map((tool, i) => (
                        <motion.a
                            key={tool.name}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 flex items-center gap-4 group hover:border-white/10 transition-all"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-${tool.color}-500/10 border border-${tool.color}-500/20 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                <tool.icon className={`w-5 h-5 text-${tool.color}-400`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-sm group-hover:text-accent-gold transition-colors">{tool.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                        </motion.a>
                    ))}
                </div>
            </div>

            {/* Security Notice */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-5 flex items-start gap-4"
            >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Verified & Secure</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        All official software is distributed via GitHub Releases. Only download from this portal to ensure security and compatibility.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
