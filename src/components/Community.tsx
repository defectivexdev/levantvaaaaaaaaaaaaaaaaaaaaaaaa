'use client';

import { motion } from 'framer-motion';
import { Facebook, Instagram, MessageSquare, Heart, Youtube } from 'lucide-react';

export default function Community() {
    const socials = [
        {
            name: 'Facebook',
            icon: <Facebook className="w-12 h-12" />,
            href: 'https://www.facebook.com/levant.vas/',
            color: 'group-hover:text-blue-500',
            glow: 'rgba(59, 130, 246, 0.3)',
        },
        {
            name: 'Instagram',
            icon: <Instagram className="w-12 h-12" />,
            href: 'https://www.instagram.com/levantva/',
            color: 'group-hover:text-pink-500',
            glow: 'rgba(236, 72, 153, 0.3)',
        },
        {
            name: 'Discord',
            icon: <MessageSquare className="w-12 h-12" />,
            href: 'https://discord.levant-va.com/',
            color: 'group-hover:text-indigo-400',
            glow: 'rgba(129, 140, 248, 0.3)',
        },
        {
            name: 'Donate',
            icon: <Heart className="w-12 h-12" />,
            href: 'https://www.paypal.com/ncp/payment/MKGQUKEYEMYLJ',
            color: 'group-hover:text-red-500',
            glow: 'rgba(239, 68, 68, 0.3)',
        },
        {
            name: 'YouTube',
            icon: <Youtube className="w-12 h-12" />,
            href: 'https://www.youtube.com/@levantva',
            color: 'group-hover:text-red-600',
            glow: 'rgba(220, 38, 38, 0.3)',
        },
    ];

    return (
        <section id="community" className="py-24 px-4 relative">
            <div className="max-w-5xl mx-auto text-center relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Connect with <span className="text-accent-gold">Our World</span>
                    </h2>
                    <div className="divider mb-8" />
                    <p className="text-gray-400 mb-16 max-w-2xl mx-auto text-lg">
                        Join a professional community of pilots and aviation enthusiasts. 
                        Stay updated with our latest operations and events!
                    </p>
                </motion.div>

                {/* Social Links Grid */}
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                    {socials.map((social, index) => (
                        <motion.a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            whileHover={{ y: -10 }}
                            className={`group relative glass-card p-10 flex flex-col items-center transition-all duration-300 border-white/[0.06] hover:border-white/20`}
                            style={{ 
                                '--glow-color': social.glow 
                            } as React.CSSProperties}
                        >
                            <div className={`text-gray-400 transition-all duration-300 transform group-hover:scale-110 ${social.color}`}>
                                {social.icon}
                            </div>
                            <p className="mt-5 font-bold tracking-widest text-xs uppercase text-gray-500 group-hover:text-white transition-colors">
                                {social.name}
                            </p>
                            
                            {/* Hover Backdrop Glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--glow-color)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </motion.a>
                    ))}
                </div>
            </div>

            {/* Background Decorative Blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-accent-gold/5 blur-[120px] rounded-full pointer-events-none" />
        </section>
    );
}
