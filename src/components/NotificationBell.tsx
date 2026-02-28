'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Award, FileText, TrendingUp, Calendar, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
    pirep_approved: FileText,
    pirep_rejected: FileText,
    rank_up: TrendingUp,
    award: Award,
    event: Calendar,
    tour: Calendar,
    system: Info,
};

const typeColors: Record<string, string> = {
    pirep_approved: 'text-green-400',
    pirep_rejected: 'text-red-400',
    rank_up: 'text-amber-400',
    award: 'text-purple-400',
    event: 'text-blue-400',
    tour: 'text-cyan-400',
    system: 'text-gray-400',
};

function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/portal/notifications?limit=15');
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {}
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const markAllRead = async () => {
        setLoading(true);
        try {
            await fetch('/api/portal/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {}
        setLoading(false);
    };

    const markOneRead = async (id: string) => {
        try {
            await fetch('/api/portal/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {}
    };

    const handleClick = (n: Notification) => {
        if (!n.read) markOneRead(n._id);
        if (n.link) window.location.href = n.link;
    };

    return (
        <div ref={panelRef} className="relative">
            <button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-12 w-80 bg-[#0a0a0a] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                            <h3 className="text-sm font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    disabled={loading}
                                    className="flex items-center gap-1 text-xs text-accent-gold hover:text-accent-bronze transition-colors disabled:opacity-50"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const Icon = typeIcons[n.type] || Bell;
                                    const color = typeColors[n.type] || 'text-gray-400';
                                    return (
                                        <button
                                            key={n._id}
                                            onClick={() => handleClick(n)}
                                            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-white/5 transition-colors border-b border-white/[0.06] last:border-0 ${!n.read ? 'bg-white/[0.02]' : ''}`}
                                        >
                                            <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-medium truncate ${!n.read ? 'text-white' : 'text-gray-400'}`}>
                                                        {n.title}
                                                    </p>
                                                    {!n.read && (
                                                        <span className="w-2 h-2 bg-accent-gold rounded-full flex-shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
