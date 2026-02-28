'use client';

import { useState } from 'react';
import { 
    Book, 
    ChevronRight, 
    Plane, 
    Shield, 
    Award, 
    Mic, 
    Info,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

interface HandbookSection {
    id: string;
    title: string;
    icon: any;
    content: React.ReactNode;
}

export default function HandbookPage() {
    const [activeSection, setActiveSection] = useState('intro');

    const sections: HandbookSection[] = [
        {
            id: 'intro',
            title: 'Welcome to Levant',
            icon: Plane,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed">
                        Welcome to Levant Virtual Airline. By joining our ranks, you have become part of a community dedicated to the highest standards of simulation realism and community engagement.
                    </p>
                    <div className="p-4 bg-accent-gold/5 border border-accent-gold/20 rounded-xl">
                        <h4 className="text-accent-gold font-bold mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Our Mission
                        </h4>
                        <p className="text-sm text-gray-400 italic">
                            "To provide an immersive, professional, and friendly environment for flight simulation enthusiasts across the Middle East and beyond."
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'ops',
            title: 'Flight Operations',
            icon: Book,
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="text-white font-bold mb-3">General Rules</h4>
                        <ul className="grid gap-2">
                            {[
                                'Pilots must maintain a professional conduct on VATSIM.',
                                'Flight time must be recorded using the Levant ACARS tracker.',
                                'Simulated time must be real-time unless specifically allowed.',
                                'Direct-to shortcuts are allowed but must be realistic.'
                            ].map((rule, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h4 className="text-white font-bold mb-3">Landing Standards</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="text-green-400 text-xs font-bold uppercase">Soft</p>
                                <p className="text-white font-mono mb-1">0 to -250 fpm</p>
                                <p className="text-[10px] text-gray-500">Full credits awarded</p>
                            </div>
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-yellow-400 text-xs font-bold uppercase">Firm</p>
                                <p className="text-white font-mono mb-1">-251 to -500 fpm</p>
                                <p className="text-[10px] text-gray-500">Partial credits awarded</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'ranks',
            title: 'Ranks & Promotion',
            icon: Award,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        Pilots progress through the ranks based on flight hours and landing quality. Each rank unlocks larger aircraft and premium routes.
                    </p>
                    <div className="bg-[#111]/50 rounded-xl border border-white/[0.06] divide-y divide-white/5">
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-white font-medium">Cadet</span>
                            <span className="text-gray-500 text-xs">Entry Level</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-blue-400 font-medium">Second Officer</span>
                            <span className="text-gray-500 text-xs">50 Hours</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-green-400 font-medium">First Officer</span>
                            <span className="text-gray-500 text-xs">150 Hours</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-accent-gold font-medium">Captain</span>
                            <span className="text-gray-500 text-xs">500 Hours</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'comms',
            title: 'Communication',
            icon: Mic,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        Standard UNICOM (122.800) procedure should be followed when no ATC is available.
                    </p>
                    <div className="p-4 bg-[#111]/50 rounded-xl border-l-4 border-accent-gold">
                        <p className="text-white text-sm font-mono italic">
                            "Levant 123, taxiing to runway 15 via C, M, D. Beirut Traffic."
                        </p>
                    </div>
                    <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-gray-400">
                            Failing to communicate on networks like VATSIM can lead to suspension from the VA.
                        </p>
                    </div>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Pilot Handbook</h1>
                <p className="text-gray-500 text-xs mt-0.5">Rules, regulations, and guidelines</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-80 space-y-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                activeSection === section.id
                                    ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                                    : 'bg-[#0a0a0a] border-white/[0.06] text-gray-500 hover:text-white hover:border-white/[0.1]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <section.icon className="w-5 h-5" />
                                <span className="font-bold">{section.title}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`} />
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 min-h-[400px]">
                    {sections.find(s => s.id === activeSection)?.content}
                </div>
            </div>
        </div>
    );
}
