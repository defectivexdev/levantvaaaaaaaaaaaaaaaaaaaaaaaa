'use client';

import React from 'react';

interface RankBadgeProps {
    rank: string;
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const rankImages: Record<string, string> = {
    'Cadet': '/img/ranks/cadet.png',
    'Second Officer': '/img/ranks/secondofficer.png',
    'First Officer': '/img/ranks/firstofficer.png',
    'Senior First Officer': '/img/ranks/seniorcaptain.png', // Mapping Senior FO to Senior Captain as per user feedback or directory availability
    'Captain': '/img/ranks/captain.png',
    'Senior Captain': '/img/ranks/seniorcaptain.png',
};

export default function RankBadge({ rank, className = '', showText = false, size = 'md' }: RankBadgeProps) {
    const isAdministrator = rank === 'Administrator' || rank === 'Admin';
    const rankImg = rankImages[rank];

    const sizeClasses = {
        sm: 'h-6',
        md: 'h-8',
        lg: 'h-12'
    };

    if (isAdministrator) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded text-[10px] font-bold border border-purple-500/20 tracking-wider">
                    ADMIN
                </span>
            </div>
        );
    }

    if (rankImg) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <img 
                    src={rankImg} 
                    alt={rank} 
                    className={`${sizeClasses[size]} w-auto object-contain`} 
                    title={rank}
                />
                {showText && <span className="text-gray-300 text-sm font-medium">{rank}</span>}
            </div>
        );
    }

    return (
        <span className={`text-gray-300 text-sm font-medium ${className}`}>
            {rank}
        </span>
    );
}
