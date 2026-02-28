'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Shield, Loader2, Lock, Mail, Plane } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
    const router = useRouter();
    const { isAdmin, isLoading: checkingAuth, refresh } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in as admin
    useEffect(() => {
        if (!checkingAuth && isAdmin) {
            router.replace('/portal/admin');
        }
    }, [checkingAuth, isAdmin, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error('Invalid credentials, please try again.');
                setLoading(false);
                return;
            }

            // Check if user is admin
            if (!data.user?.isAdmin && data.user?.role !== 'Admin') {
                toast.error('Access denied. Administrator privileges required.');
                // Logout the non-admin session
                await fetch('/api/auth/logout', { method: 'POST' });
                setLoading(false);
                return;
            }

            toast.success('Login Successful! Welcome to Levant Virtual.');
            await refresh();
            router.push('/portal/admin');

        } catch {
            toast.error('Invalid credentials, please try again.');
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-[#0a0a0f] to-amber-950/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
                {/* Grid pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block mb-6">
                        <div className="w-20 h-20 mx-auto relative">
                            <img 
                                src="/img/logo.png" 
                                alt="Levant Virtual" 
                                className="w-full h-full object-contain drop-shadow-2xl"
                            />
                        </div>
                    </Link>
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-500 text-xs font-bold uppercase tracking-[0.3em]">Admin Portal</span>
                        <Shield className="w-5 h-5 text-amber-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Control Center
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">Authorized personnel only</p>
                </div>

                {/* Login Card */}
                <div className="relative">
                    {/* Card glow */}
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-amber-500/20 via-white/5 to-transparent rounded-2xl" />
                    
                    <div className="relative bg-[#111118] rounded-2xl p-8 border border-white/[0.06] shadow-2xl shadow-black/50">
                        {/* Status indicator */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-green-500/80 text-[10px] font-bold uppercase tracking-[0.2em]">System Online</span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-gray-500 text-[10px] uppercase font-bold tracking-[0.15em] mb-2 ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="admin@levant-va.com"
                                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-gray-500 text-[10px] uppercase font-bold tracking-[0.15em] mb-2 ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative overflow-hidden bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Authenticating...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Access Control Center
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="mt-8 pt-6 border-t border-white/[0.06]">
                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-2 text-gray-500 hover:text-white text-xs font-medium transition-colors"
                            >
                                <Plane className="w-3.5 h-3.5" />
                                <span>Back to Pilot Login</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-700 text-[10px] uppercase tracking-[0.2em] mt-6">
                    Levant Virtual Airline &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
