import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">
            <Navbar />
            
            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-4xl mx-auto px-6 space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-4 bg-accent-gold/10 rounded-2xl mb-2 animate-pulse">
                            <Shield className="w-12 h-12 text-accent-gold" />
                        </div>
                        <h1 className="text-5xl font-bold text-white tracking-tight">
                            Privacy Policy
                        </h1>
                        <p className="text-gray-400 text-lg">Safe. Transparent. Secure.</p>
                        <div className="flex justify-center">
                            <div className="h-1 w-20 bg-accent-gold rounded-full" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="glass-card p-8 md:p-12 space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32" />

                        <section className="relative z-10">
                            <p className="text-white font-bold text-xl mb-6">Welcome to Levant Virtual Airline.</p>
                            
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-accent-gold flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-accent-gold rounded-full" />
                                    Introduction
                                </h2>
                                <p className="text-gray-300 leading-relaxed text-lg">
                                    At Levant Virtual Airlines (Levant VA), we take your privacy seriously. 
                                    This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.
                                </p>
                                <p className="text-gray-300 leading-relaxed italic border-l-2 border-white/10 pl-4 py-2">
                                    We are committed to adhering to the General Data Protection Regulation (GDPR) and other applicable laws. 
                                    By using our services, you agree to the practices outlined in this policy.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-6 relative z-10">
                            <h2 className="text-xl font-bold text-accent-gold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent-gold rounded-full" />
                                1. Information We Collect
                            </h2>
                            <div className="grid gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <strong className="text-white block mb-1">Personal Identification Details</strong>
                                    <p className="text-gray-400 text-sm">This includes your name, email address, and VATSIM ID.</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <strong className="text-white block mb-1">Service Usage Data</strong>
                                    <p className="text-gray-400 text-sm">We track your participation such as flight statistics, completed routes, and engagement.</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <strong className="text-white block mb-1">Communication Records</strong>
                                    <p className="text-gray-400 text-sm">Interactions via Discord, emails, and support requests are recorded for quality service.</p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6 relative z-10">
                            <h2 className="text-xl font-bold text-accent-gold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent-gold rounded-full" />
                                2. Purpose of Data Collection
                            </h2>
                            <ul className="space-y-3">
                                {[
                                    'Manage Your Membership: Account maintenance and portal access.',
                                    'Enhance Our Services: Flight data analysis for operational improvement.',
                                    'Provide Customer Support: Timely feedback and concern resolution.',
                                    'Keep You Informed: Important updates and service notifications.'
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                                        <div className="h-6 w-6 rounded-full bg-accent-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-accent-gold text-xs font-bold">{idx + 1}</span>
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="space-y-6 relative z-10">
                            <h2 className="text-xl font-bold text-accent-gold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent-gold rounded-full" />
                                3. Your Rights (GDPR)
                            </h2>
                            <div className="bg-dark-800/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest font-bold">Your entitlement as a pilot:</p>
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                    {['Access Data', 'Correct Inaccuracies', 'Delete Data', 'Restrict Usage', 'Withdraw Consent'].map((right) => (
                                        <div key={right} className="flex items-center gap-3">
                                            <div className="h-1.5 w-1.5 bg-accent-gold rounded-full" />
                                            <span className="text-gray-300 font-medium">{right}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6 relative z-10">
                            <h2 className="text-xl font-bold text-accent-gold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent-gold rounded-full" />
                                4. Data Security
                            </h2>
                            <p className="text-gray-300 leading-relaxed">
                                We are dedicated to ensuring that your personal data remains safe. We use encryption, access controls, and regular monitoring to protect against unauthorized access.
                            </p>
                        </section>

                        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-sm text-gray-500 font-mono">
                                Last updated: January 2026
                            </div>
                            <Link href="/" className="inline-flex items-center gap-2 text-accent-gold hover:text-white transition-all font-bold group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Return Home
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
