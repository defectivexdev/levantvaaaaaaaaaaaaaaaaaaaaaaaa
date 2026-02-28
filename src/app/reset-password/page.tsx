'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams?.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        if (!token) {
            setStatus('error');
            setMessage('Missing reset token');
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage('Password successfully reset!');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Network error');
        }
    };

    if (!token) {
        return (
            <div className="text-center text-red-400">
                Invalid or missing token. Please request a new link.
                <div className="mt-4">
                    <Link href="/forgot-password" className="text-accent-gold underline">Forgot Password</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md glass-card p-8">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
                <p className="text-gray-400 text-sm">Enter your new secure password</p>
            </div>

            {status === 'success' ? (
                <div className="text-center">
                    <div className="bg-green-500/20 text-green-400 p-4 rounded-lg mb-6">
                        {message}
                    </div>
                    <p className="text-gray-400 text-sm">Redirecting to login...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {status === 'error' && (
                        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                            {message}
                        </div>
                    )}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-gold transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-gold transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full btn-primary py-3 disabled:opacity-50"
                    >
                        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen py-6 px-4 flex flex-col justify-center items-center">
            <div className="fixed inset-0 bg-gradient-to-br from-dark-900 via-primary-900/10 to-dark-900 -z-10" />
            {/* Suspense is required for useSearchParams usage in Client Components */}
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
