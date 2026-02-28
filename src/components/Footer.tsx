export default function Footer() {
    return (
        <footer className="bg-[#080808] py-12 border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4">
                {/* Main Footer Content Removed as per request */}

                {/* Copyright */}
                <div className="text-center border-t border-white/10 pt-8">
                    <p className="text-gray-500 text-sm mb-4">
                        Copyright © 2026 - Levant Virtual
                    </p>

                    {/* Disclaimer */}
                    <div className="max-w-3xl mx-auto">
                        <p className="text-gray-600 text-xs font-semibold mb-2">Disclaimer!</p>
                        <p className="text-gray-600 text-xs leading-relaxed">
                            This is not a real world airline and Levant Virtual has no affiliation with any
                            real-world airlines. All Trademarks and Logos belong to their respective owners.
                            This website is for flight simulation purpose only.
                        </p>
                        <div className="mt-4">
                            <a href="/privacy" className="text-accent-gold hover:text-white text-xs transition-colors">
                                Privacy Policy
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer >
    );
}
