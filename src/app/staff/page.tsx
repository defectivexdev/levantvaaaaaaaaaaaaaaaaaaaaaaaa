'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Mail, Shield, MessageSquare, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// --- Components ---

function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    const divRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current || isFocused) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,182,71,0.1), transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
}

export default function StaffPage() {
    const [staffGroups, setStaffGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch('/api/staff/members');
                const data = await res.json();
                if (data.success && data.members) {
                    const groups: Record<string, any> = {};
                    
                    data.members.forEach((m: any) => {
                        const category = m.role?.category || 'Other';
                        const roleId = m.role?._id;
                        if (!roleId) return;
                        
                        if (!groups[category]) {
                            groups[category] = { category: category, roles: {} };
                        }

                        if (!groups[category].roles[roleId]) {
                            groups[category].roles[roleId] = { role: m.role, members: [] };
                        }
                        groups[category].roles[roleId].members.push(m);
                    });

                    const categoryOrder = ['Board of Governor', 'Director', 'Chief Pilot', 'Other'];
                    
                    const sortedGroups = Object.values(groups).sort((a: any, b: any) => {
                        const indexA = categoryOrder.indexOf(a.category);
                        const indexB = categoryOrder.indexOf(b.category);
                        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                    }).map((group: any) => ({
                        ...group,
                        roles: Object.values(group.roles).sort((a: any, b: any) => (a.role.order || 0) - (b.role.order || 0))
                    }));
                    
                    setStaffGroups(sortedGroups);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, []);

    return (
        <div className="min-h-screen bg-[#030303] selection:bg-accent-gold/30">
            <Navbar />
            
            {/* Background elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-gold/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent-bronze/5 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 pt-40 pb-32 px-4 md:px-8">
                <div className="max-w-7xl mx-auto space-y-24">
                    
                    {/* Header Section */}
                    <div className="text-center space-y-6 relative">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-accent-gold text-xs font-bold tracking-[0.2em] uppercase mb-4"
                        >
                            <Shield size={14} className="animate-pulse" /> Leadership Team
                        </motion.div>
                        <h1 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter leading-none">
                            The <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">Levant</span> <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold via-accent-bronze to-accent-gold bg-[length:200%_auto] animate-gradient-x">Executive</span>
                        </h1>
                        <p className="text-gray-500 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
                            A global team of aviation enthusiasts dedicated to delivering <br className="hidden md:block" /> the ultimate virtual airline experience.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-2 border-accent-gold/20 border-t-accent-gold rounded-full animate-spin" />
                            <div className="text-accent-gold/40 text-xs font-bold tracking-widest uppercase animate-pulse">Synchronizing Staff Records</div>
                        </div>
                    ) : (
                        <div className="space-y-40">
                            {staffGroups.map((group: any, groupIndex: number) => (
                                <div key={group.category} className="space-y-16">
                                    {/* Category Divider */}
                                    <div className="flex items-center gap-6">
                                        <h2 className="text-sm font-bold tracking-[0.4em] uppercase text-white whitespace-nowrap">{group.category}</h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
                                    </div>

                                    <div className="space-y-32">
                                        {group.roles.map((roleGroup: any, roleIndex: number) => {
                                            const isBOG = group.category === 'Board of Governor';
                                            
                                            return (
                                                <div key={roleGroup.role._id} className="space-y-10">
                                                    {/* Role Title */}
                                                    <div className="flex flex-col items-start gap-2">
                                                        <h3 className={`text-2xl md:text-3xl font-display font-medium ${roleGroup.role.color || 'text-white'}`}>
                                                            {roleGroup.role.title}
                                                        </h3>
                                                        <div className="h-[2px] w-12 bg-accent-gold/40 rounded-full" />
                                                    </div>

                                                    {/* Members Grid */}
                                                    <div className={`grid gap-8 ${isBOG ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                                                        {roleGroup.members.map((member: any, i: number) => (
                                                            <motion.div
                                                                key={member._id}
                                                                initial={{ opacity: 0, y: 20 }}
                                                                whileInView={{ opacity: 1, y: 0 }}
                                                                viewport={{ once: true }}
                                                                transition={{ delay: i * 0.1 }}
                                                            >
                                                                <SpotlightCard className={`p-1 group transition-all duration-500 ${isBOG ? 'md:h-48' : 'md:h-40'}`}>
                                                                    <div className="h-full bg-[#080808]/80 backdrop-blur-xl rounded-[22px] p-6 flex items-center gap-6 border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                                                                        {/* Profile Picture */}
                                                                        <div className="relative shrink-0">
                                                                            <div className="absolute -inset-1 bg-gradient-to-tr from-accent-gold/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                                                            <div className={`relative overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl ${isBOG ? 'w-24 h-24' : 'w-20 h-20'}`}>
                                                                                {member.picture ? (
                                                                                    <img src={member.picture} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                                                        <Users size={isBOG ? 32 : 24} className="text-zinc-700 group-hover:text-accent-gold transition-colors" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Details */}
                                                                        <div className="flex-1 min-w-0 space-y-2">
                                                                            <div>
                                                                                <h4 className={`font-display font-bold text-white truncate group-hover:text-accent-gold transition-colors ${isBOG ? 'text-2xl' : 'text-xl'}`}>
                                                                                    {member.name || `${member.pilot?.first_name} ${member.pilot?.last_name}`}
                                                                                </h4>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="text-[10px] font-bold text-white/40 tracking-[0.1em] uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                                                        {member.callsign || member.pilot?.pilot_id}
                                                                                    </span>
                                                                                    {member.pilot?.country && (
                                                                                        <span className="text-[10px] text-zinc-500 uppercase">{member.pilot.country}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-4 pt-1">
                                                                                <a href={`mailto:${member.email || roleGroup.role.email}`} className="text-white/20 hover:text-white transition-colors">
                                                                                    <Mail size={16} />
                                                                                </a>
                                                                                {member.discord && (
                                                                                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                                                                                        <MessageSquare size={14} />
                                                                                        {member.discord}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Decorative Corner Icon */}
                                                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-20 transition-opacity">
                                                                            <Shield size={24} className="text-white" />
                                                                        </div>
                                                                    </div>
                                                                </SpotlightCard>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer Callout */}
                    {!loading && (
                        <div className="pt-20 border-t border-white/5 text-center">
                            <h3 className="text-2xl font-display font-medium text-white mb-2">Want to join the team?</h3>
                            <p className="text-zinc-500 text-sm mb-6">We are always looking for passionate pilots to help us grow.</p>
                            <Link 
                                href="https://discord.levant-va.com/" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-accent-gold text-xs font-bold tracking-widest uppercase hover:gap-3 transition-all"
                            >
                                Join Discord <ExternalLink size={14} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}
