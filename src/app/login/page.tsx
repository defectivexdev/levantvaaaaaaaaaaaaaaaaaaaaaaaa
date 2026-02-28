'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { BorderBeam } from '@/components/ui/border-beam';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: checkingAuth, refresh } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (!checkingAuth && isAuthenticated) {
            router.replace('/portal/dashboard');
        }
    }, [checkingAuth, isAuthenticated, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 500) {
                    throw new Error('Server is temporarily unavailable. Please try again later.');
                }
                throw new Error(data.error || 'Invalid email or password');
            }

            await refresh();
            router.push('/portal/dashboard');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setLoading(false);
        }
    };

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6 px-4 flex flex-col justify-center items-center">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-primary-900/10 to-dark-900 -z-10" />

            {/* Header */}
            <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <Link href="/" className="inline-block mb-4">
                    <div className="w-25 h-24 mx-auto relative group">
                        <img src="/img/logo.png" alt="Levant Virtual" className="w-full h-full object-contain filter group-hover:brightness-110 transition-all" />
                    </div>
                </Link>
                <h1 className="text-4xl font-display font-medium text-white mb-2 tracking-tight">Welcome Back</h1>
                <p className="text-white/60 text-sm font-medium">Sign in to your pilot portal</p>
            </div>

            {/* Login Card */}
            <Card className="relative w-full max-w-md overflow-hidden bg-dark-900/50 backdrop-blur-2xl border-white/5 shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-500">
                <BorderBeam
                    duration={6}
                    size={400}
                    className="from-transparent via-accent-gold to-transparent"
                />
                <BorderBeam
                    duration={6}
                    delay={3}
                    size={400}
                    borderWidth={2}
                    className="from-transparent via-blue-500 to-transparent"
                />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl mb-6 text-sm text-center font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-2 ml-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-accent-gold/50 focus:bg-white/10 transition-all shadow-sm"
                            placeholder="pilot@levant-va.com"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Password</label>
                            <Link href="/forgot-password" className="text-[10px] uppercase font-bold tracking-widest text-accent-gold hover:text-yellow-400 transition-colors">
                                Reset?
                            </Link>
                        </div>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-accent-gold/50 focus:bg-white/10 transition-all shadow-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent-gold hover:bg-yellow-400 text-dark-900 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-accent-gold/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Sign In To Portal'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center relative z-10">
                    <p className="text-gray-400 text-xs font-medium">
                        Need an account?{' '}
                        <Link href="/register" className="text-white hover:text-accent-gold transition-colors font-bold">
                            Create Identity
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
