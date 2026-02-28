'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnseenAward {
    _id: string;
    award_id: {
        _id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        category?: string;
    };
    earned_at: string;
}

export default function AwardCelebration() {
    const [queue, setQueue] = useState<UnseenAward[]>([]);
    const [current, setCurrent] = useState<UnseenAward | null>(null);

    const fetchUnseen = useCallback(async () => {
        try {
            const res = await fetch('/api/awards/unseen');
            if (!res.ok) return;
            const data: UnseenAward[] = await res.json();
            if (data.length > 0) {
                setQueue(data);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchUnseen();
    }, [fetchUnseen]);

    useEffect(() => {
        if (queue.length > 0 && !current) {
            setCurrent(queue[0]);
            setQueue(prev => prev.slice(1));
        }
    }, [queue, current]);

    useEffect(() => {
        if (!current) return;

        // Fire confetti burst
        const duration = 2500;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors: ['#FFD700', '#00cfd5', '#ffffff'],
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors: ['#FFD700', '#00cfd5', '#ffffff'],
            });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();

        // Also fire a big center burst
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 100,
                origin: { x: 0.5, y: 0.4 },
                colors: ['#FFD700', '#00cfd5', '#ffffff', '#a855f7'],
            });
        }, 300);
    }, [current]);

    const dismiss = async () => {
        if (current) {
            // Mark as seen
            try {
                await fetch('/api/awards/unseen', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [current._id] }),
                });
            } catch { /* silent */ }
        }
        setCurrent(null);
    };

    return (
        <AnimatePresence>
            {current && current.award_id && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={dismiss} />
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="relative w-full max-w-sm bg-gradient-to-b from-[#141824] to-[#0a0e17] border border-accent-gold/30 rounded-2xl p-8 shadow-2xl text-center"
                    >
                        <button onClick={dismiss} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        {/* Glowing badge */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                            className="mx-auto mb-6"
                        >
                            {current.award_id.imageUrl ? (
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
                                    <img
                                        src={current.award_id.imageUrl}
                                        alt={current.award_id.name}
                                        className="relative w-24 h-24 rounded-full object-cover border-[3px] border-cyan-400 shadow-[0_0_30px_rgba(0,207,213,0.4)]"
                                    />
                                </div>
                            ) : (
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 rounded-full bg-accent-gold/20 blur-xl animate-pulse" />
                                    <div className="relative w-24 h-24 rounded-full bg-accent-gold/10 border-[3px] border-accent-gold flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                                        <Award className="w-10 h-10 text-accent-gold" />
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <p className="text-accent-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Achievement Unlocked</p>
                            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {current.award_id.name}
                            </h2>
                            {current.award_id.description && (
                                <p className="text-gray-400 text-sm leading-relaxed mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    {current.award_id.description}
                                </p>
                            )}
                            {current.award_id.category && (
                                <span className="inline-block px-3 py-1 bg-white/5 border border-white/[0.08] rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    {current.award_id.category}
                                </span>
                            )}
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="text-gray-600 text-[10px] mt-6 uppercase tracking-wider"
                        >
                            Congratulations, Captain!
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
