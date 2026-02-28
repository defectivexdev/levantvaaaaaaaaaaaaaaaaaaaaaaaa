'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Network error');
        }
    };

    return (
        <div className="min-h-screen py-6 px-4 flex flex-col justify-center items-center">
            <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-primary-900/10 to-dark-900 -z-10" />

            <div className="w-full max-w-md glass-card p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-gray-400 text-sm">Enter your email to receive a reset link</p>
                </div>

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="bg-green-500/20 text-green-400 p-4 rounded-lg mb-6">
                            {message}
                        </div>
                        <p className="text-gray-400 text-sm">
                            Check your email inbox (and spam folder).
                        </p>
                        <Link href="/login" className="btn-primary w-full mt-6 block text-center">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' && (
                            <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                                {message}
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-gold transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full btn-primary py-3 disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <div className="text-center mt-4">
                            <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
