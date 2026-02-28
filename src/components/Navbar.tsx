'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const centerLinks = [
        { name: 'About', href: '#about' },
        { name: 'Map', href: '#map' },
        { name: 'Partners', href: '#partners' },
        { name: 'Staff Team', href: '/staff' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-lg border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* 3-Zone Grid: Logo | Center Nav | Portal Button */}
                <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center h-24">
                    {/* Zone 1: Logo (left) */}
                    <Link href="/" className="flex items-center group justify-self-start">
                        <span className="font-display font-bold text-3xl text-white tracking-wider group-hover:text-accent-gold transition-colors">
                            LV V<span className="text-[20px]">IRTUAL</span>
                        </span>
                    </Link>

                    {/* Zone 2: Center Navigation */}
                    <div className="flex items-center gap-8">
                        {centerLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-gray-300 hover:text-white transition-colors duration-200 text-sm font-medium"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Zone 3: Pilot Portal (right) */}
                    <div className="justify-self-end flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-5 py-2 rounded-lg text-sm font-bold tracking-wider text-dark-950 transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg, #C5A059 0%, #cd7f32 100%)', fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            Pilot Portal
                        </Link>
                    </div>
                </div>

                {/* Mobile: standard flex layout */}
                <div className="flex md:hidden items-center justify-between h-20">
                    <Link href="/" className="flex items-center group">
                        <span className="font-display font-bold text-2xl text-white tracking-wider group-hover:text-accent-gold transition-colors">
                            LV V<span className="text-[16px]">IRTUAL</span>
                        </span>
                    </Link>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Drawer */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/10 space-y-1">
                        <div className="text-[9px] font-bold text-gray-600 tracking-[0.25em] uppercase px-2 pb-2">Pilot Tools</div>
                        {centerLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block py-3 px-2 text-gray-300 hover:text-white transition-colors text-sm"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="border-t border-white/[0.06] my-2" />
                        <Link
                            href="/login"
                            className="block py-3 px-2 text-accent-gold hover:text-white transition-colors text-sm font-bold"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Pilot Portal
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
