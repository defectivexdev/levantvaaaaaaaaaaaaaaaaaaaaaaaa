import Link from 'next/link';

export default function BlacklistPage() {
    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <h1 className="text-9xl font-bold text-accent-gold/20">404</h1>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Access Denied</h2>
                    <p className="text-gray-400">
                        Your account has been blacklisted from Levant Virtual Airline.
                        Please contact the administrator for more information.
                    </p>
                </div>
                <div className="pt-4">
                    <Link
                        href="https://discord.levant-va.com/" 
                        target="_blank"
                        className="inline-block bg-accent-gold hover:bg-accent-bronze text-dark-900 font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                        Contact via Discord
                    </Link>
                </div>
            </div>
        </div>
    );
}
