'use client';

import Link from 'next/link';
import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect';
import { HyperText } from '@/components/ui/hyper-text';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { motion } from 'framer-motion';

export default function Hero() {
    const words = [
        {
            text: "Levant",
        },
        {
            text: "Virtual",
        },
        {
            text: "Airlines.",
            className: "text-accent-gold dark:text-accent-gold",
        },
    ];

    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-black/70 z-10" />
                <img
                    src="/img/hero-img.png"
                    alt="Hero Background"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Background Beams Effect */}
            <BackgroundBeams className="z-10" />

            {/* Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden z-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-gold/5 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Content */}
            <div className="relative z-30 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
                {/* Logo Icon */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 0.75 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-0 animate-float"
                >
                    <div className="w-[180px] h-[180px] mx-auto relative">
                        <img src="/img/logo.png" alt="Levant Virtual Logo" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]" />
                    </div>
                </motion.div>

                {/* Title with Typewriter Effect */}
                <TypewriterEffectSmooth words={words} className="mb-2" cursorClassName="bg-accent-gold" />

                {/* Tagline */}
                <div className="mb-8">
                    <HyperText className="text-xl md:text-3xl text-gradient font-bold">
                        The Inspiration of Middle East
                    </HyperText>
                </div>

                {/* Description */}
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                    Experience the skies of the Middle East with our advanced flight operations
                    software and supportive community of aviation enthusiasts.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="flex flex-col sm:flex-row gap-6 justify-center"
                >
                    <Link href="#about" className="btn-primary group relative overflow-hidden px-10 py-4">
                        <span className="relative z-10">Explore Now!</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Link>
                    <Link href="/login" className="btn-secondary group relative px-10 py-4 backdrop-blur-sm">
                        <span className="relative z-10">Pilot Portal</span>
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400"
            >
                <span className="text-xs uppercase tracking-[0.3em] font-medium">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-accent-gold to-transparent" />
            </motion.div>
        </section>
    );
}
