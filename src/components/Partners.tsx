'use client';

import { motion } from 'framer-motion';

export default function Partners() {
    const partners = [
        { name: 'IVAO Partner VA', logo: '/img/ivao-partner-va.png', width: 140, link: 'https://www.ivao.aero' },
        { name: 'VATSIM', logo: '/img/vatsim.png', width: 140, link: 'https://www.vatsim.net' },
    ];

    return (
        <section id="partners" className="py-24 bg-transparent border-t border-white/[0.06] relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-accent-gold/5 blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Our <span className="text-accent-gold">Official</span> Partners
                    </h2>
                    <div className="divider" />
                    <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-lg leading-relaxed">
                        Collaborating with the world's leading virtual aviation networks to provide 
                        the most authentic experience possible.
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 w-full px-4">
                    {partners.map((partner, index) => (
                        <motion.div 
                            key={partner.name} 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.6 }}
                            className="flex items-center justify-center"
                        >
                            <a 
                                href={partner.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="block group relative"
                            >
                                <img
                                    src={partner.logo}
                                    alt={`${partner.name} Logo`}
                                    className="h-20 md:h-28 w-auto object-contain filter grayscale opacity-50 contrast-125 brightness-150 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]"
                                />
                                {/* Underline decoration */}
                                <div className="absolute -bottom-4 left-0 w-0 h-0.5 bg-accent-gold group-hover:w-full transition-all duration-500" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
