'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, BookOpen, Plane, Compass, Award, Shield } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

const services = [
    {
        id: 'flight-tracking',
        title: 'Flight Tracking',
        description: 'Real-time tracking of all flights with detailed route visualization and live updates.',
        icon: <Globe className="w-12 h-12" />,
    },
    {
        id: 'pilot-career',
        title: 'Pilot Career',
        description: 'Progress through ranks, earn credits, and advance your virtual aviation career.',
        icon: <Award className="w-12 h-12" />,
    },
    {
        id: 'world-explorer',
        title: 'World Explorer',
        description: 'Discover airports and routes around the world with our comprehensive route network.',
        icon: <Plane className="w-12 h-12" />,
    },
];

export default function Services() {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <section className="py-24 px-4 bg-transparent relative border-t border-white/[0.06]">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Excellence in <span className="text-accent-gold">Every Flight</span>
                    </h2>
                    <div className="divider w-24 h-1.5" />
                    <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-lg">
                        Providing the most advanced virtual aviation infrastructure for pilots who demand professionalism.
                    </p>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className={`group relative glass-card p-10 cursor-pointer overflow-hidden transition-all duration-500 hover:bg-white/10 hover:-translate-y-2`}
                            onClick={() => setActiveIndex(index)}
                        >
                            {/* Border Beam Effect on Hover or Active */}
                            <BorderBeam 
                                size={250} 
                                duration={12} 
                                delay={index * 2} 
                                colorFrom="#d4af37" 
                                colorTo="#cd7f32"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            />

                            <div className="relative z-10">
                                <div className="text-accent-gold mb-8 transform group-hover:scale-110 transition-transform duration-500">
                                    {service.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-accent-gold transition-colors duration-300">
                                    {service.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                                    {service.description}
                                </p>
                            </div>

                            {/* Decorative Background Icon */}
                            <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                                {index === 0 ? <Globe className="w-32 h-32" /> : index === 1 ? <Award className="w-32 h-32" /> : <Plane className="w-32 h-32" />}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
