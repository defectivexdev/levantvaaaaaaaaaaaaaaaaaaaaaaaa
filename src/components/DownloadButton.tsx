'use client';

import { useEffect, useState } from 'react';
import { GitHubRelease } from '@/types/github';
import { Download, ExternalLink, Calendar } from 'lucide-react';

interface DownloadButtonProps {
    owner: string;
    repo: string;
}

export const DownloadButton = ({ owner, repo }: DownloadButtonProps) => {
    const [release, setRelease] = useState<GitHubRelease | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then((data: GitHubRelease) => {
                setRelease(data);
                setError(false);
            })
            .catch(err => {
                console.error("Failed to fetch GitHub release:", err);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [owner, repo]);

    const msiAsset = release?.assets.find(a => a.name.endsWith('.msi'));
    const downloadUrl = msiAsset?.browser_download_url || `https://github.com/${owner}/${repo}/releases/latest`;
    
    const formattedDate = release ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(release.published_at)) : '';

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Fire and forget tracking with security
        fetch('/api/v1/telemetry/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'LEVANT-SECRET-KEY-2026'
            },
            body: JSON.stringify({ 
                version: release?.tag_name || 'Latest',
                platform: 'Windows'
            }),
        }).catch(err => console.error("Tracking failed:", err));

        // Start download
        window.location.href = downloadUrl;
    };

    if (loading) {
        return (
            <div className="animate-pulse bg-white/5 border border-white/[0.08] rounded-2xl h-16 w-64 flex items-center justify-center">
                <div className="text-xs text-white/40 tracking-widest font-mono uppercase">Checking Latest Version...</div>
            </div>
        );
    }

    if (error) {
        return (
            <button 
                onClick={() => window.open(`https://github.com/${owner}/${repo}/releases`, '_blank')}
                className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-8 py-4 rounded-2xl font-bold hover:bg-rose-500/20 transition-all group"
            >
                <ExternalLink size={20} />
                <span>View All Releases</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <button 
                onClick={handleDownload}
                className="flex items-center gap-4 bg-gradient-to-br from-accent-gold to-[#b8860b] text-black px-10 py-5 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-gold/20 group relative overflow-hidden text-left"
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Download size={24} className="group-hover:bounce" />
                <div className="flex flex-col">
                    <span className="text-sm uppercase tracking-tighter leading-none opacity-70 font-mono">Download ACARS</span>
                    <span className="text-xl leading-none mt-1">Version {release?.tag_name || 'Latest'}</span>
                </div>
            </button>
            
            {release && (
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 font-mono tracking-widest uppercase px-2">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-accent-gold/40" />
                        <span>Released: {formattedDate}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
