'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard,
    User,
    PlaneTakeoff,
    FileText,
    Edit,
    UserCheck,
    MessageSquare,
    Settings,
    LogOut,
    Trophy,
    Map,
    ShoppingBag,
    Download,
    Award,
    LucideIcon,
    Wrench,
    Plane,
    Landmark,
    SlidersHorizontal,
    ShieldAlert,
    Paintbrush,
    ChevronDown,
    BarChart3,
    Calendar,
} from 'lucide-react';

interface MenuItem {
    name: string;
    path: string;
    icon: LucideIcon;
    external?: boolean;
}

interface AdminSubGroup {
    label: string;
    items: MenuItem[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const { isAdmin, user } = useAuth();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [manualPirepCount, setManualPirepCount] = useState(0);

    const isActive = useCallback((path: string) => {
        if (!pathname) return false;
        if (pathname === path) return true;
        // Only match as active if pathname starts with path + '/' (child route)
        // but NOT if there's a more specific menu item that matches
        return pathname.startsWith(path + '/');
    }, [pathname]);

    useEffect(() => {
        if (isAdmin) {
            fetch('/api/maintenance/repair')
                .then(res => res.json())
                .then(data => { if (data.airlineFunds != null) setVaultBalance(data.airlineFunds); })
                .catch(() => {});
            // Fetch pending manual PIREP count for notification badge
            fetch('/api/admin/pireps/manual-count')
                .then(res => res.json())
                .then(data => { if (data.count != null) setManualPirepCount(data.count); })
                .catch(() => {});
        }
    }, [isAdmin]);

    const menuItems = useMemo<{ category: string; items: MenuItem[] }[]>(() => [
        {                              
            category: 'PILOT',
            items: [
                { name: 'Dashboard', path: '/portal/dashboard', icon: LayoutDashboard },
                { name: 'Profile', path: '/portal/profile', icon: User },
            ],
        },
        {
            category: 'OPERATIONS',
            items: [
                { name: 'Book Flight', path: '/portal/simbrief', icon: Plane },
                { name: 'My Reports', path: '/portal/reports', icon: FileText },
                { name: 'Tours', path: '/portal/tours', icon: Map },
                { name: 'Events', path: '/portal/events', icon: Calendar },
                { name: 'Leaderboard', path: '/portal/leaderboard', icon: Trophy },
                { name: 'Downloads', path: '/portal/downloads', icon: Download },
            ],
        },
        {
            category: 'COMMUNITY',
            items: [
                { name: 'Discord', path: 'https://discord.levant-va.com/', icon: MessageSquare, external: true },
                { name: 'Pilot Store', path: '/portal/store', icon: ShoppingBag },
                { name: 'Liveries Download', path: '/portal/liveries', icon: Paintbrush },
                { name: 'Settings', path: '/portal/settings', icon: Settings },
            ],
        },
        {
            category: 'ADMIN',
            items: [
                { name: 'User Management', path: '/portal/admin/users', icon: User },
                { name: 'PIREP Management', path: '/portal/admin/pireps', icon: FileText },
            ],
        },
    ], []);

    const adminSubGroups = useMemo<AdminSubGroup[]>(() => [
        {
            label: 'Content',
            items: [
                { name: 'Tour Management', path: '/portal/admin/tours', icon: Map },
                { name: 'Tour Validation', path: '/portal/admin/tour-validation', icon: Award },
                { name: 'Event Management', path: '/portal/admin/events', icon: Calendar },
                { name: 'Award Management', path: '/portal/admin/badges', icon: Award },
                { name: 'Store Management', path: '/portal/admin/store', icon: ShoppingBag },
                { name: 'Livery Management', path: '/portal/admin/liveries', icon: Paintbrush },
                { name: 'DOTM Management', path: '/portal/admin/dotm', icon: Award },
            ],
        },
        {
            label: 'System',
            items: [
                { name: 'Airline Settings', path: '/portal/admin/settings', icon: SlidersHorizontal },
                { name: 'Staff Management', path: '/portal/admin/staff', icon: UserCheck },
                { name: 'Blacklist', path: '/portal/admin/blacklist', icon: ShieldAlert },
            ],
        },
    ], []);

    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
            window.location.href = '/login';
        }
    }, []);

    return (
        <aside className="w-64 bg-gradient-to-b from-[#0a0e17] to-[#0d1117] border-r border-cyan-500/10 flex-shrink-0 flex flex-col h-screen fixed top-0 left-0 overflow-y-auto overflow-x-hidden z-50 shadow-2xl shadow-cyan-500/5">
            {/* Logo */}
            <div className="flex items-center justify-between px-5 py-6 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
                <Link href="/portal/dashboard" className="block group">
                    <img src="/img/logo.png" alt="Levant" className="h-16 w-auto transition-transform group-hover:scale-105" />
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-2 py-4 space-y-6">
                {menuItems.map((category) => {
                    const isAdminCategory = category.category === 'ADMIN';
                    if (isAdminCategory && !isAdmin) return null;
                    return (
                        <div key={category.category}>
                            {/* Admin section gets a glowing divider + badge header */}
                            {isAdminCategory ? (
                                <>
                                    <div className="mx-3 mb-4 mt-1">
                                        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 mb-2">
                                        <span className="text-[9px] font-black tracking-[0.3em] uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                            {category.category}
                                        </span>
                                        <span className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
                                    </div>
                                </>
                            ) : (
                                <h3 className="text-[9px] font-bold text-cyan-500/60 tracking-[0.25em] mb-2 px-3 uppercase">
                                    {category.category}
                                </h3>
                            )}
                            <div className="space-y-0.5">
                                {category.items.map((item) => {
                                    const active = isActive(item.path);
                                    const linkClasses = `flex items-center px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 group relative ${
                                        active
                                            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10 border border-cyan-500/20'
                                            : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/5 hover:to-transparent border border-transparent'
                                    }`;
                                    const iconClasses = `w-[18px] h-[18px] mr-3 transition-all duration-200 flex-shrink-0 ${
                                        active ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400 group-hover:scale-110'
                                    }`;
                                    const activeBar = active ? (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full shadow-lg shadow-cyan-500/50" />
                                    ) : null;

                                    if (item.external) {
                                        return (
                                            <a key={item.name} href={item.path} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                                                {activeBar}
                                                <item.icon className={iconClasses} />
                                                {item.name}
                                            </a>
                                        );
                                    }
                                    return (
                                        <Link key={item.name} href={item.path} className={linkClasses}>
                                            {activeBar}
                                            <item.icon className={iconClasses} />
                                            {item.name}
                                            {item.name === 'PIREP Management' && manualPirepCount > 0 && (
                                                <span className="ml-auto flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                    <span className="text-[9px] font-bold text-red-400">{manualPirepCount}</span>
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}

                                {/* Admin sub-group items (flat list) */}
                                {isAdminCategory && adminSubGroups.map((group) => (
                                    <div key={group.label}>
                                        <div className="px-3 py-2 text-[9px] font-bold text-cyan-500/50 uppercase tracking-[0.15em]">
                                            {group.label}
                                        </div>
                                        {group.items.map((item) => {
                                            const active = isActive(item.path);
                                            const linkClasses = `flex items-center px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 group relative ${
                                                active
                                                    ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 shadow-lg shadow-cyan-500/10 border border-cyan-500/20'
                                                    : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/5 hover:to-transparent border border-transparent'
                                            }`;
                                            const iconClasses = `w-[18px] h-[18px] mr-3 transition-all duration-200 flex-shrink-0 ${
                                                active ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400 group-hover:scale-110'
                                            }`;
                                            const activeBar = active ? <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full shadow-lg shadow-cyan-500/50" /> : null;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.path}
                                                    className={linkClasses}
                                                >
                                                    {activeBar}
                                                    <item.icon className={iconClasses} />
                                                    {item.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Section: Vault Widget + Pilot Info + Logout */}
            <div className="border-t border-white/[0.04] p-2 space-y-1">
                {/* Airline Vault Widget */}
                {isAdmin && vaultBalance !== null && (
                    <Link href="/portal/admin/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group shadow-lg shadow-cyan-500/5">
                        <Landmark size={16} className="text-cyan-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                            <div className="text-[8px] font-bold text-cyan-500/60 uppercase tracking-wider">Airline Vault</div>
                            <div className="text-xs font-mono font-bold text-cyan-400 truncate">{vaultBalance.toLocaleString()} Cr</div>
                        </div>
                    </Link>
                )}

                {/* Pilot callsign badge */}
                {user && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/5 to-transparent border border-cyan-500/10">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-[10px] font-bold flex-shrink-0 shadow-lg shadow-cyan-500/20">
                            {(user.pilotId || 'P').charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-cyan-400 truncate">{user.customCallsign || user.pilotId || 'Pilot'}</div>
                            <div className="text-[8px] text-cyan-500/50 font-mono truncate">{user.email || ''}</div>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 text-[13px] font-medium text-gray-500 hover:text-rose-400 hover:bg-gradient-to-r hover:from-rose-500/10 hover:to-transparent rounded-xl transition-all group relative border border-transparent hover:border-rose-500/20"
                    title="Sign Out"
                >
                    <LogOut className="w-[18px] h-[18px] mr-3 flex-shrink-0" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
