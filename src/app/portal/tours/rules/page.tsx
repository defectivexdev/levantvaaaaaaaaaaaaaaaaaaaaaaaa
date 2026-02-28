'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';
import { ArrowLeft, Shield, CheckCircle, XCircle, AlertTriangle, BookOpen } from 'lucide-react';

export default function TourRulesPage() {
    return (
        <div className="space-y-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between bg-[#0a0a0a] border border-white/[0.08] rounded-2xl px-4 py-3">
                    <Link href="/portal/tours" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tours
                    </Link>
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Tour Rules</div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/portal/tours"
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
                        >
                            View Tours
                        </Link>
                        <a
                            href="https://discord.levant-va.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
                        >
                            Discord
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white">Tour Rules & Guidelines</h1>
                <p className="text-gray-400 text-lg">Please read carefully before participating in any tour</p>
            </div>

            {/* General Rules */}
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                    <Shield className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">General Rules</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">Valid ACARS Required</h3>
                            <p className="text-gray-400 text-sm">All flights must be tracked using the official Levant Virtual ACARS application. Manual PIREPs will not be accepted for tour validation.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">Sequential Completion</h3>
                            <p className="text-gray-400 text-sm">Tour legs must be completed in the exact order specified. You cannot skip legs or complete them out of sequence.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">Correct Route</h3>
                            <p className="text-gray-400 text-sm">Each leg must be flown between the exact departure and arrival airports specified in the tour. Alternative airports are not permitted.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">Flight Standards</h3>
                            <p className="text-gray-400 text-sm">All flights must meet Levant Virtual's standard PIREP requirements including realistic flight time, landing rate, and no excessive violations.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-semibold mb-1">Time Limits</h3>
                            <p className="text-gray-400 text-sm">Tours may have start and end dates. All legs must be completed within the specified timeframe to be eligible for rewards.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Process */}
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-2xl font-bold text-white">Submission Process</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">1</span>
                            Complete All Legs
                        </h3>
                        <p className="text-gray-400 text-sm ml-8">Fly all tour legs in order using ACARS. Each flight will be automatically logged in your flight history.</p>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">2</span>
                            Submit Tour Report
                        </h3>
                        <p className="text-gray-400 text-sm ml-8">Once all legs are complete, submit your tour completion report through the tour detail page. The system will automatically verify your flights.</p>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">3</span>
                            Admin Validation
                        </h3>
                        <p className="text-gray-400 text-sm ml-8">Staff will review your submission and verify all flights against the tour requirements. This process typically takes 24-48 hours.</p>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">4</span>
                            Receive Rewards
                        </h3>
                        <p className="text-gray-400 text-sm ml-8">Upon approval, you'll receive your tour rewards including credits and any special badges. These will be automatically added to your account.</p>
                    </div>
                </div>
            </div>

            {/* Validation Outcomes */}
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                    <Shield className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">Validation Outcomes</h2>
                </div>

                <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <h3 className="text-green-400 font-bold">Approved</h3>
                        </div>
                        <p className="text-gray-300 text-sm">Your tour is complete! Rewards have been added to your account and the tour is marked as completed in your profile.</p>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-yellow-400 font-bold">Needs Modification</h3>
                        </div>
                        <p className="text-gray-300 text-sm">Staff found minor issues with your submission. You can edit your report and resubmit without re-flying. Check the admin notes for details.</p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <XCircle className="w-5 h-5 text-red-400" />
                            <h3 className="text-red-400 font-bold">Rejected</h3>
                        </div>
                        <p className="text-gray-300 text-sm">Your submission did not meet tour requirements. You must re-fly all legs to be eligible. Common reasons include missing flights, wrong routes, or violations.</p>
                    </div>
                </div>
            </div>

            {/* Prohibited Actions */}
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">Prohibited Actions</h2>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Using non-official ACARS clients or modified software</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Submitting manual PIREPs for tour legs</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Flying legs out of order or skipping legs</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Using slew, teleportation, or unrealistic acceleration</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Submitting fraudulent or falsified flight data</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>Flying to alternative airports not specified in the tour</span>
                    </li>
                </ul>
                <p className="text-red-400 text-sm font-semibold mt-4">
                    ⚠️ Violations of these rules may result in tour disqualification and potential account sanctions.
                </p>
            </div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm py-8">
                <p>These rules are subject to change. Last updated: {new Date().toLocaleDateString()}</p>
                <p className="mt-2">For questions or clarifications, please contact staff via Discord.</p>
            </div>
            </div>

            <Footer />
        </div>
    );
}
