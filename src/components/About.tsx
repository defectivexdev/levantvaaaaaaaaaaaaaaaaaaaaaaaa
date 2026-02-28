'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function About() {
    return (
        <section id="about" className="py-24 px-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-900/5 to-transparent" />

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Badge */}
                    <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase border border-accent-gold/30 rounded-full text-accent-gold bg-accent-gold/5">
                        Established Legacy
                    </span>

                    {/* Title */}
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                        The Leading <span className="text-accent-gold">Virtual Airline</span> <br className="hidden md:block"/> of Middle East
                    </h2>

                    {/* Divider */}
                    <div className="divider mb-8" />

                    {/* Description */}
                    <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto mb-12">
                        With a special focus on historical operations together with up-to-date modern flights, 
                        <span className="text-white"> Levant Virtual</span> brings you to newer skies with our 
                        advanced flight operations software and a supportive community of aviation enthusiasts!
                    </p>

                    {/* CTA Button */}
                    <div className="flex justify-center">
                        <Link href="/register" className="btn-primary group relative overflow-hidden px-10 py-4 inline-block">
                            <span className="relative z-10">Register Now!</span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
